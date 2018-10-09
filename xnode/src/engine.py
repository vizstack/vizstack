import argparse
import json
import sys
import threading
from multiprocessing import Process, Queue
from typing import NoReturn, Optional

from constants import SymbolId, Actions
from execute import run_script

# ======================================================================================================================
# Request prefixes.
# -----------------
# Any message passed to the stdin of this script should be prefixed by one of the following constants. This prefix
# determines how the script should interpret the remainder of the input string.
# ======================================================================================================================

# A change was made to some file that may warrant a re-execution.
_EDIT_HEADER: str = 'change:'
# A symbol with given ID should have its shell fetched.
_FETCH_HEADER: str = 'fetch:'


class _ExecutionManager:
    """Runs the user's Python script in a subprocess and prints requested symbol schemas to stdout.

    On creation, the `_ExecutionManager` starts a new process and a new thread. The new process runs
    `execute.run_script()`, which in turn runs the user-written script within a `Pdb` instance. The symbol schemas
    produced by any evaluated watch expressions are added to a queue. The thread reads this queue, printing any
    schemas to stdout as they are added. Client programs, such as `repl.js`, can read these printed schemas.

    The thread is necessary to prevent blocking; otherwise, the engine would either have to block until script execution
    is done, preventing re-runs, or schemas would only be output after the process completes, which would produce long
    delays in longer scripts. The subprocess cannot write to stdout itself, so the thread must do so instead.

    Once the user-written script has executed, `execute.run_script()` waits for the user to request the data objects of
    additional symbols. Those requests are sent from the client to stdin, and then sent to the `_ExecutionManager`,
    which adds the request to a queue that is read by `execute.run_script()`.
    """

    _THREAD_QUIT: str = 'quit'

    def __init__(self,
                 script_path: str) -> None:
        """Creates a process to execute the user-written script and a thread to read the returned schemas.

        Args:
            script_path: the absolute path to the user-written script to be executed
        """
        self.exec_process, self.print_queue, self.fetch_queue = _ExecutionManager._start_exec_process(script_path)
        self.print_thread = threading.Thread(target=_ExecutionManager._start_print_thread, args=(self.exec_process,
                                                                                                 self.print_queue))
        self.print_thread.start()

    def terminate(self) -> None:
        """Terminates the subprocess and the associated printing thread.

        The `_ExecutionManager` is hereafter dead, and a new one should be created if another script must be run.
        """
        self.exec_process.terminate()
        self.exec_process.join()
        self.print_queue.put(_ExecutionManager._THREAD_QUIT)
        self.print_thread.join()

    def fetch_symbol(self,
                     symbol_id: SymbolId,
                     actions: Actions) -> None:
        """Fetches the data object for a symbol from the subprocess.

        The subprocess holds the ground-truth of all objects in the script's namespace, so requests must be forwarded
        to the process itself. These requests are only processed after the script has finished running, and reflect
        the value of symbols at the program's end.

        The fetched symbol schema is written to the `print_queue`, which is printed by the printing thread.

        Args:
            symbol_id: The ID of the symbol whose data should be returned.
            actions: Actions that should be performed on the returned data; see `ACTION-SCHEMA.md`.
        """
        self.fetch_queue.put({
            'symbol_id': symbol_id,
            'actions': actions,
        })

    @staticmethod
    def _start_exec_process(script_path: str) -> (Process, Queue, Queue):
        """Starts a new process, which runs a user-written script inside of a Pdb instance.

        Two queues are created to communicate with the new process; one is filled by the subprocess with symbol schemas
        as they are encountered in watch statements or after they are requested by `_fetch_symbol()`. The other queue is
        filled by the `_ExecutionManager` with the IDs of symbols to be fetched.

        Args:
            script_path: The path to a user-written script to be executed in the subprocess.

        Returns:
            The handle to the subprocess.
            The queue filled with symbol schemas by the process.
            The queue filled with requested symbol IDs by the `_ExecutionManager`.
        """
        fetch_queue: Queue = Queue()
        print_queue: Queue = Queue()
        process: Process = Process(target=run_script, args=(fetch_queue, print_queue, script_path))
        process.daemon: bool = True
        process.start()
        print_queue.get()  # gotta do this here once for some reason

        return process, print_queue, fetch_queue

    @staticmethod
    def _start_print_thread(process: Process,
                            print_queue: Queue) -> None:
        """Starts a new thread, which reads from a queue and prints any found strings.

        An `_ExecutionManager` will create a print thread to pipe all schemas produced by its execution subprocess to
        stdout, where it can be read by client programs.

        Note that the thread blocks between each item added to the queue.

        Args:
            process: A handle to the script-running subprocess.
            print_queue: A queue filled by the subprocess with schema strings to be printed to stdout.

        """
        while process.is_alive():
            l: str = print_queue.get()  # blocks
            if len(l) > 0:
                if l == _ExecutionManager._THREAD_QUIT:
                    return
                print(l)
            sys.stdout.flush()


# ======================================================================================================================
# Execution control.
# ------------------
# Determine whether the user-written script associated with the engine should be re-run, do so, and then submit
# additional symbol data requests after execution completes.
# ======================================================================================================================

def _should_execute(script_path: str,
                    message) -> bool:
    """Determines if a new execution is necessary after a file has been edited.

    Currently, we re-run regardless of the edit, but when we implement caching it should be done here.

    Args:
        script_path: The path to the user-written script to (potentially) be executed.
        message: A message received from stdin describing the edit to a file, in format
            "{EDIT_HEADER}{file_path}?{edit}"
            where the format of `edit` has not yet been defined.

    Returns:
        Whether execution should be performed.
    """
    file, edit = message.replace(_EDIT_HEADER, '').split('?')
    # TODO handle caching
    return True


def _execute(exec_manager: Optional[_ExecutionManager],
             script_path: str) -> _ExecutionManager:
    """Creates a new `_ExecutionManager` to run a given script, printing its watched variable schemas to stdout.

    If an `_ExecutionManager` already exists, it is first killed, so that only information from the most recent run
    is sent to the client.

    Args:
        exec_manager: The existing `_ExecutionManager`, if one exists.
        script_path: Absolute path to the user-written script to be executed.

    Returns:
        A new manager which will run `script_path` and print its watched expressions.
    """
    if exec_manager:
        exec_manager.terminate()
    exec_manager: _ExecutionManager = _ExecutionManager(script_path)
    return exec_manager


def _fetch_symbol(exec_manager: _ExecutionManager,
                  message: str) -> None:
    """Fetches a symbol table slice containing the data of a requested symbol.

    Args:
        exec_manager: The `_ExecutionManager` to which the request should be proxied.
        message: A string sent by the client to stdin of the format
            "{FETCH_HEADER}{symbol_id}?{actions}"
            where `actions` is the JSON string of an action dict, as described in `ACTION-SCHEMA.md`.
    """
    contents: str = message.replace(_FETCH_HEADER, '').split('?')
    symbol_id: SymbolId = contents[0]
    actions: Actions = json.loads(contents[1])

    exec_manager.fetch_symbol(symbol_id, actions)


# ======================================================================================================================
# Main loop.
# ----------
# Associate the engine with a script path given in the command line and then wait for and process requests written by
# the client to stdin.
# ======================================================================================================================

def _read_args() -> str:
    """Read the path to the user-written script which should be executed by the engine from the command line.

    Returns:
        Absolute path to the script to be executed.
    """
    parser: argparse.ArgumentParser = argparse.ArgumentParser()
    parser.add_argument('script', type=str)
    args = parser.parse_args()
    return args.script


def main() -> NoReturn:
    """Reads commands from the client and adds watch expressions, reruns the user's script, and fetches symbol data
    accordingly.

    The function runs on a loop until terminated, consuming inputs from stdin and performing actions based on the
    read inputs. None of the called functions are blocking, so the loop immediately returns to wait for the next
    message.
    """

    script_path: str = _read_args()
    exec_manager: Optional[_ExecutionManager] = None
    while True:
        message: str = input()
        if message.startswith(_EDIT_HEADER):
            if _should_execute(script_path, message):
                exec_manager: _ExecutionManager = _execute(exec_manager, script_path)

        elif message.startswith(_FETCH_HEADER):
            if exec_manager:
                _fetch_symbol(exec_manager, message)


if __name__ == '__main__':
    main()
