import functools
import json
import pdb
import re
import sys
import traceback
from inspect import currentframe, getframeinfo
from multiprocessing import Queue
from os.path import normpath, normcase
from types import FrameType
from typing import Callable, Mapping, Union, Any, Optional

import xn
from constants import SymbolId, SymbolSlice, Actions
from viz import VisualizationEngine


# Taken from atom-python-debugger
class _ScriptExecutor(pdb.Pdb):
    """Runs a given Python script within the same process.

    The `_ScriptExecutor` is a modified `Pdb` instance, using the `Pdb._runscript()` function to execute given
    scripts within the `_ScriptExecutor`'s process so that values can be read from it and sent to clients.
    """

    def __init__(self,
                 **kwargs) -> None:
        pdb.Pdb.__init__(self, **kwargs)

    # ==================================================================================================================
    # Public methods.
    # ==================================================================================================================

    def execute(self,
                script_path: str) -> None:
        """Execute a script within the `_ScriptExecutor` instance, allowing its flow to be controlled by the instance.

        `_execute()` should be called only once per `_ScriptExecutor` instance, as its behavior is unknown after
        multiple runs.

        Args:
            script_path (str): The absolute path to the user-written script to be executed.
        """
        self._runscript(_ScriptExecutor._normalize_path(script_path))

    # ==================================================================================================================
    # `pdb` overrides.
    # ----------------
    # `pdb` calls these functions at various points during the execution of a script; we perform no special behavior
    # at any of them, allowing the script's execution to continue normally.
    # ==================================================================================================================

    def user_line(self, frame: FrameType) -> None:
        pass

    def user_return(self,
                    frame: FrameType,
                    return_value: Any) -> None:
        pass

    # `message` and `error` are called by `Pdb` to write to the respective streams. We block those messages so that
    # only object info will be sent to stdout, and thus read by the engine.
    def message(self, msg: str) -> None:
        pass

    def error(self, msg: str) -> None:
        pass

    # These are overrides that were included in `atom-python-debugger`; TODO: investigate their purpose.
    def precmd(self, line):
        return line

    def postcmd(self, stop, line):
        return stop

    # ==================================================================================================================
    # Static helper methods.
    # ----------------------
    # Functions which are used to transform incoming messages to a usable format.
    # ==================================================================================================================

    @staticmethod
    def _normalize_path(file_path: str) -> str:
        """Normalizes a file path so it can be safely executed.

        Args:
            file_path: A string file path.

        Returns:
            The normalized file path.
        """
        return normcase(normpath(file_path))


class _PrintOverwriter:
    """
    An object to be used as a replacement for stdout, which uses a given function to send printed strings to the client.
    """

    def __init__(self, send_message: Callable[[Optional[SymbolSlice], Optional[SymbolId], bool, Optional[str],
                                               Optional[str]], None]):
        self.send_message: Callable[[Optional[SymbolSlice], Optional[SymbolId], bool, Optional[str],
                                     Optional[str]], None] = send_message

    def write(self, text: str) -> None:
        if text == '\n':
            return
        self.send_message(None, None, False, '{}\n'.format(text), None)

    def flush(self) -> None:
        pass


class _DataclassJSONEncoder(json.JSONEncoder):
    """
    An extension of the default JSON encoder that can serialize pseudo-dataclasses (regular Python objects whose field
    values are all serializable).
    """

    def default(self, o: Any):
        try:
            return super().default(o)
        except TypeError:
            return o.__dict__


def _send_message(send_queue: Queue,
                  symbol_slice: Optional[SymbolSlice],
                  view_symbol_id: Optional[SymbolId],
                  refresh: bool,
                  text: Optional[str],
                  error: Optional[str]) -> None:
    """Writes a message to the client containing information about symbols and the program state.

    Args:
        send_queue: A queue to which all messages created by `_send_message()` are added.
        symbol_slice: A symbol table slice that the client should add to its local store, or `None`
            if no slice should be added.
        view_symbol_id: A symbol ID that the client should view upon receiving the message, or `None`
            if no symbol should be viewed.
        refresh: Whether the client should reset its symbol table information before incorporating the new
            slice.
        text: A string printed by the user-specified script.
        error: The full text of an exception message that should be relayed to the client.
    """
    message = {
        'symbols': symbol_slice,
        'viewSymbol': view_symbol_id,
        'refresh': refresh,
        'text': text,
        'error': error,
    }
    send_queue.put(json.dumps(message, cls=_DataclassJSONEncoder))


def _execute_watch(engine: VisualizationEngine,
                   send_message: Callable[[Optional[SymbolSlice], Optional[SymbolId], bool, Optional[str],
                                           Optional[str]], None],
                   obj: Any) -> None:
    """Executes a watch statement on a given object, taking a snapshot of it and sending the symbol slice to the
    client to be viewed.

    Args:
        engine: A VisualizationEngine which should be used to generate the object's symbol slice.
        send_message: A function which sends a symbol slice and other information to the client.
        obj: An object whose symbol slice should be created and sent.
    """
    frame_info = getframeinfo(currentframe().f_back.f_back)
    filename, lineno = frame_info.filename, frame_info.lineno
    symbol_id: SymbolId = engine.take_snapshot(obj, name='{}: {}'.format(filename, lineno))
    symbol_slice: SymbolSlice = engine.get_snapshot_slice(symbol_id)
    send_message(symbol_slice, symbol_id, False, None, None)


def _fetch_symbol(engine: VisualizationEngine,
                  send_message: Callable[[Optional[SymbolSlice], Optional[SymbolId], bool, Optional[str],
                                          Optional[str]], None],
                  symbol_id: SymbolId) -> None:
    """Fetches the symbol slice of a given symbol and sends it to the client.

    Does not signal to the client to create a viewer for the requested symbol.

    Args:
        engine: A VisualizationEngine where the snapshot of the symbol has already been taken.
        send_message: A function which sends a symbol slice and other information to the client.
        symbol_id: The symbol ID of the object whose slice should be sent.
    """
    symbol_slice: SymbolSlice = engine.get_snapshot_slice(symbol_id)
    send_message(symbol_slice, None, False, None, None)


# ======================================================================================================================
# Public methods.
# ---------------
# Methods to be called by clients that want to run a Python script and receive schema representations of objects in
# its namespace.
# ======================================================================================================================

def run_script(receive_queue: Queue,
               send_queue: Queue,
               script_path: str) -> None:
    """Runs a given script, writing the value of watched variables to a queue and then writing the values of
    additional variables requested by a client to another queue.

    The given script is executed to completion; afterwards, symbol IDs are read on a loop from `receive_queue`.
    The data objects for these symbols, as well as the shells of symbols they reference, are written as JSON strings
    to `send_queue`.

    Should be called as the main function of a new process.

    Args:
        receive_queue: A queue shared with the calling process to which requests for new symbol schemas are
            written by the parent.
        send_queue: A queue shared with the calling process to which this process writes symbol schema strings.
        script_path: The absolute path to a user-written script to be executed.
    """

    send_queue.put('wat')  # gotta send some junk once for some reason
    send_message: Callable[[Optional[SymbolSlice], Optional[SymbolId], bool, Optional[str], Optional[str]],
                           None] = functools.partial(_send_message, send_queue)
    engine: VisualizationEngine = VisualizationEngine()
    xn.set_view_fn(functools.partial(_execute_watch, engine, send_message))

    # Replace stdout with an object that conveys all statements printed by the user script as messages
    sys.stdout = _PrintOverwriter(send_message)

    executor: _ScriptExecutor = _ScriptExecutor()
    try:
        send_message(None, None, True, None, None)
        executor.execute(script_path)
        while True:
            request: Mapping[str, Union[SymbolId, Actions]] = receive_queue.get(True)
            _fetch_symbol(engine, send_message, request['symbol_id'])
    except:
        raw_error_msg: str = traceback.format_exc()
        result = re.search(r"^(Traceback.*?:\n)(.*File \"<string>\", line 1, in <module>\s)(.*)$", raw_error_msg,
                           re.DOTALL)
        clean_error_msg: str = result.group(1) + result.group(3)
        send_message(None, None, False, None, clean_error_msg)
