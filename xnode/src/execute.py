import functools
import json
import pdb
import re
import sys
from inspect import currentframe, getframeinfo
from multiprocessing import Queue
from os.path import normpath, normcase
from types import FrameType
from typing import Callable, Mapping, Union, Any, Optional, List

import traceback
import xnode
from xnode.constants import VizTableSlice, VizId, ExpansionMode, ExecutionEngineMessage
from xnode.viz._engine import VisualizationEngine
from xnode.viz import TextPrimitive, Color

# The type of the function which is called to send a message to the parent process.
_SendMessage = Callable[[Optional[VizTableSlice], Optional[VizId], bool, bool], None]


# Taken from atom-python-debugger
class _ScriptExecutor(pdb.Pdb):  # type: ignore
    """Runs a given Python script within the same process.

    The `_ScriptExecutor` is a modified `Pdb` instance, using the `Pdb._runscript()` function to execute given
    scripts within the `_ScriptExecutor`'s process so that values can be read from it and sent to clients.
    """

    def __init__(self, **kwargs) -> None:
        pdb.Pdb.__init__(self, **kwargs)  # type: ignore

    # ==================================================================================================================
    # Public methods.
    # ==================================================================================================================

    def execute(self, script_path: str, script_args: List[str]) -> None:
        """Execute a script within the `_ScriptExecutor` instance, allowing its flow to be controlled by the instance.

        `_execute()` should be called only once per `_ScriptExecutor` instance, as its behavior is unknown after
        multiple runs.

        Args:
            script_path: The absolute path to the user-written script to be executed.
            script_args: Arguments that should be passed to the executed script.
        """
        normalized_path = _ScriptExecutor._normalize_path(script_path)
        sys.argv = [normalized_path] + script_args
        self._runscript(normalized_path)

    # ==================================================================================================================
    # `pdb` overrides.
    # ----------------
    # `pdb` calls these functions at various points during the execution of a script; we perform no special behavior
    # at any of them, allowing the script's execution to continue normally.
    # ==================================================================================================================

    def user_line(self, frame: FrameType) -> None:
        pass

    def user_return(self, frame: FrameType, return_value: Any) -> None:
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

    def __init__(self, engine: VisualizationEngine, send_message: _SendMessage) -> None:
        self._unprinted_text: str = ''
        self._engine: VisualizationEngine = engine
        self._send_message: _SendMessage = send_message

    def write(self, text: str) -> None:
        self._unprinted_text += text
        if self._unprinted_text.endswith('\n') and self._unprinted_text != '\n':
            frame: Optional[FrameType] = currentframe()
            assert frame is not None
            frame_info = getframeinfo(frame.f_back)
            filename, lineno = frame_info.filename, frame_info.lineno
            viz_id: VizId = self._engine.take_snapshot(self._unprinted_text, _ScriptExecutor._normalize_path(
                filename), lineno)
            viz_slice: VizTableSlice = self._engine.get_snapshot_slice(viz_id)
            self._send_message(viz_slice, viz_id, False, False)
            self._unprinted_text = ''

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


def _send_message(
        send_queue: Queue, viz_slice: Optional[VizTableSlice], view_viz_id: Optional[VizId],
        refresh: bool, script_finished: bool,
) -> None:
    """Writes a message to the client containing information about symbols and the program state.

    Args:
        send_queue: A queue to which all messages created by `_send_message()` are added.
        viz_slice: A viz table slice that the client should add to its local store, or `None`
            if no slice should be added.
        view_viz_id: A viz ID that the client should view upon receiving the message, or `None`
            if no symbol should be viewed.
        refresh: Whether the client should clear its renderings and reset its viz table information before
            incorporating the new slice.
        script_finished: Whether the executor has finished running the script.
    """
    message = ExecutionEngineMessage(
        view_viz_id,
        viz_slice,
        refresh,
        script_finished,
    )
    send_queue.put(json.dumps(message, cls=_DataclassJSONEncoder))


def _execute_watch(send_message: _SendMessage, engine: VisualizationEngine, *objects: Any,
                   expansion_mode: Optional[str] = None) -> None:
    """Executes a watch statement on a given object, taking a snapshot of it and sending the symbol slice to the
    client to be viewed.

    Args:
        engine: A VisualizationEngine which should be used to generate the object's symbol slice.
        send_message: A function which sends a symbol slice and other information to the client.
        objects: Object(s) whose symbol slice should be created and sent.
    """
    for obj in objects:
        frame: Optional[FrameType] = currentframe()
        assert frame is not None
        frame_info = getframeinfo(frame.f_back.f_back)
        filename, lineno = frame_info.filename, frame_info.lineno
        viz_id: VizId = engine.take_snapshot(obj, _ScriptExecutor._normalize_path(filename), lineno)
        viz_slice: VizTableSlice = engine.get_snapshot_slice(viz_id,
                                                             expansion_mode=None if expansion_mode is None
                                                             else ExpansionMode(expansion_mode))
        send_message(viz_slice, viz_id, False, False)


def _fetch_viz(
        send_message: _SendMessage, engine: VisualizationEngine, viz_id: VizId,
        expansion_state: ExpansionMode
) -> None:
    """Fetches the symbol slice of a given symbol and sends it to the client.

    Does not signal to the client to create a viewer for the requested symbol.

    Args:
        engine: A VisualizationEngine where the snapshot of the symbol has already been taken.
        send_message: A function which sends a symbol slice and other information to the client.
        viz_id: The symbol ID of the object whose slice should be sent.
    """
    viz_slice: VizTableSlice = engine.get_snapshot_slice(viz_id, expansion_state)
    send_message(viz_slice, None, False, False)


# ======================================================================================================================
# Public methods.
# ---------------
# Methods to be called by clients that want to run a Python script and receive schema representations of objects in
# its namespace.
# ======================================================================================================================


def run_script(receive_queue: Queue, send_queue: Queue, script_path: str, script_args: List[str]) -> None:
    """Runs a given script, writing the vizzes of watched objects to a queue and then writing the vizzes of
    additional variables requested by a client to another queue.

    The given script is executed to completion; afterwards, viz IDs are read on a loop from `receive_queue`.
    The viz entries for these objects, as well as the entries of vizzes they reference, are written as JSON strings
    to `send_queue`.

    Should be called as the main function of a new process.

    Args:
        receive_queue: A queue shared with the calling process to which requests for new viz models are written by
            the parent.
        send_queue: A queue shared with the calling process to which this process writes messages.
        script_path: The absolute path to a user-written script to be executed.
        script_args: Arguments that should be passed to the executed script.
    """
    send_message: _SendMessage = functools.partial(_send_message, send_queue)

    # this won't be processed by the engine, a "junk" message must be sent for some reason
    send_message(None, None, False, False)

    engine: VisualizationEngine = VisualizationEngine()
    xnode.set_show_fn(functools.partial(_execute_watch, send_message, engine))

    # Replace stdout with an object that queues all statements printed by the user script as messages
    sys.stdout = _PrintOverwriter(engine, send_message)  # type: ignore

    executor: _ScriptExecutor = _ScriptExecutor()
    try:
        send_message(None, None, True, False)
        executor.execute(script_path, script_args)
        # Indicate to the client that the script has finished executing
        send_message(None, None, False, True)
        while True:
            request: Mapping[str, Union[VizId, ExpansionMode]] = receive_queue.get(True)
            if request is None:
                break
            assert not isinstance(request['viz_id'], ExpansionMode)
            assert isinstance(request['expansion_state'], ExpansionMode)
            _fetch_viz(send_message, engine, request['viz_id'], request['expansion_state'])
    except:
        raw_error_msg: str = traceback.format_exc()
        try:
            result = re.search(
                r"^(Traceback.*?:\n)(.*File \"<string>\", line 1, in <module>\s)(.*)$",
                raw_error_msg, re.DOTALL
            )
            assert result is not None
            clean_error_msg: str = result.group(1) + result.group(3)
            result = re.search(
                r"^Traceback \(most recent call last\):\s*File \"(.*)\", line (\d*),?(.*)$",
                clean_error_msg, re.DOTALL
            )
            assert result is not None
            viz_id: VizId = engine.take_snapshot(
                TextPrimitive(clean_error_msg, Color.ERROR), result.group(1), int(result.group(2))
            )
            viz_slice: VizTableSlice = engine.get_snapshot_slice(viz_id)
            send_message(viz_slice, viz_id, False, True)
        except:
            try:
                # if something goes wrong in parsing the traceback, write it directly
                viz_id: VizId = engine.take_snapshot(
                    TextPrimitive(raw_error_msg, Color.ERROR), 'engine.py', 0
                )
                viz_slice: VizTableSlice = engine.get_snapshot_slice(viz_id)
                send_message(viz_slice, viz_id, False, True)
            except:
                # if something goes terribly wrong, just print it and hope for the best
                print(raw_error_msg)
