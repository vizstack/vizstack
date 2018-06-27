import argparse
import threading
from multiprocessing import Process, Queue
from execute import run_script
import sys
import json

# TODO: section headers
THREAD_QUIT = 'quit'

WATCH_HEADER = 'watch:'
UNWATCH_HEADER = 'unwatch:'
EDIT_HEADER = 'change:'
FETCH_HEADER = 'fetch:'
SHIFT_HEADER = 'shift:'


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
    def __init__(self, script_path, watches):
        """Creates a process to execute the user-written script and a thread to read the returned schemas.

        Args:
            script_path (str): the absolute path to the user-written script to be executed
            watches (list): a list of watch statement objects, as produced by `get_watch_expression()`.
        """
        self.exec_process, self.print_queue, self.fetch_queue = _ExecutionManager._start_exec_process(script_path,
                                                                                                      watches)
        self.print_thread = threading.Thread(target=_ExecutionManager._start_print_thread, args=(self.exec_process,
                                                                                                 self.print_queue))
        self.print_thread.start()

    def terminate(self):
        """Terminates the subprocess and the associated printing thread.

        The `_ExecutionManager` is hereafter dead, and a new one should be created if another script must be run.
        """
        self.exec_process.terminate()
        self.print_queue.put(THREAD_QUIT)
        self.print_thread.join()

    def fetch_symbol(self, symbol_id, actions):
        """Fetches the data object for a symbol from the subprocess.

        The subprocess holds the ground-truth of all objects in the script's namespace, so requests must be forwarded
        to the process itself. These requests are only processed after the script has finished running, and reflect
        the value of symbols at the program's end.

        The fetched symbol schema is written to the `print_queue`, which is printed by the printing thread.

        Args:
            symbol_id (str): The ID of the symbol whose data should be returned.
            actions (dict): Actions that should be performed on the returned data; see `ACTION-SCHEMA.md`.
        """
        self.fetch_queue.put({
            'symbol_id': symbol_id,
            'actions': actions,
        })

    @staticmethod
    def _start_exec_process(script_path, watches):
        """Starts a new process, which runs a user-written script inside of a Pdb instance.

        Two queues are created to communicate with the new process; one is filled by the subprocess with symbol schemas
        as they are encountered in watch statements or after they are requested by `_fetch_symbol()`. The other queue is
        filled by the `_ExecutionManager` with the IDs of symbols to be fetched.

        Args:
            script_path (str): the path to a user-written script to be executed in the subprocess.
            watches (list): a list of watch statement objects, as produced by `get_watch_expression()`.

        Returns:
            (Process, Queue, Queue): the handle to the subprocess, the queue filled with symbol schemas by the process,
                and the queue filled with requested symbol IDs by the `_ExecutionManager`.
        """
        fetch_queue = Queue()
        print_queue = Queue()
        process = Process(target=run_script, args=(fetch_queue, print_queue, script_path, watches))
        process.start()
        print_queue.get()  # gotta do this here once for some reason

        return process, print_queue, fetch_queue

    @staticmethod
    def _start_print_thread(process, print_queue):
        """Starts a new thread, which reads from a queue and prints any found strings.

        An `_ExecutionManager` will create a print thread to pipe all schemas produced by its execution subprocess to
        stdout, where it can be read by client programs.

        Note that the thread blocks between each item added to the queue.

        Args:
            process (Process): a handle to the subprocess.
            print_queue (Queue): a queue filled by the subprocess with schema strings to be printed to stdout.

        """
        while process.is_alive():
            l = print_queue.get()  # blocks
            if len(l) > 0:
                if l == THREAD_QUIT:
                    return
                print(l)
            sys.stdout.flush()


# ======================================================================================================================
# Watch expressions.
# ------------------
# Control how watch expressions are created, removed, and shifted.
# ======================================================================================================================

def _add_watch(watches, message):
    """Adds a new watch expression to `watches`.

    Args:
        watches (list): A list of existing watch expression dicts; updated in-place.
        message (str): A string received from the client describing the new watch expression, in format
            "{WATCH_HEADER}{file_path}?{line_no}?{actions}"
            where `actions` is the JSON string of an action dict as described in `ACTION-SCHEMA.md`.
    """
    contents = message.replace(WATCH_HEADER, '').split('?')

    watch_expression = {
        'file': contents[0],
        'lineno': int(contents[1]),
        'actions': json.loads(contents[2])
    }

    watches.append(watch_expression)


def _remove_watch(watches, message):
    """Removes a watch expression from `watches`.

    The line number supplied by `message` should reflect the current position of the watch statement after any shifts in
    buffer, not necessarily the originally given position.

    Args:
        watches (list): A list of existing watch expression dicts; updated in-place.
        message: A string received from the client describing the watch expression to remove, in format
            "{UNWATCH_HEADER}{file_path}?{line_no}"
    """
    contents = message.replace(UNWATCH_HEADER, '').split('?')
    file_path = contents[0]
    lineno = int(contents[1])

    to_remove = [watch_expression for watch_expression in watches if watch_expression['file'] == file_path and
                 watch_expression['lineno'] == lineno]
    for watch_expression in to_remove:
        watches.remove(watch_expression)

        
def _shift_watch(watches, message):
    """Shifts the position of a watch expression to a new line.

    Watch expressions are hard-coded to point to a particular line number, which causes problems when new lines are
    inserted or old lines deleted. Allowing for shifts, as opposed to deleting and re-adding watch statements,
    prevents unnecessary re-executions.

    Args:
        watches (list): A list of existing watch expression dicts; updated in-place.
        message (str): A string received from the client describing watch expression shift, in format
            "{SHIFT_HEADER}{file_path}?{old_lineno}?{new_lineno}"
    """
    file_path, old_lineno, new_lineno = message.replace(SHIFT_HEADER, '').split('?')

    for watch_expression in watches:
        if watch_expression['file'] == file_path and watch_expression['lineno'] == int(old_lineno):
            watch_expression['lineno'] = int(new_lineno)


# ======================================================================================================================
# Execution control.
# ------------------
# Determine whether the user-written script associated with the engine should be re-run, do so, and then submit
# additional symbol data requests after execution completes.
# ======================================================================================================================

def _should_execute(script_path, watches, message):
    """Determines if a new execution is necessary after a file has been edited.

    Currently, we re-run regardless of the edit, but when we implement caching it should be done here.

    Args:
        script_path (str): The path to the user-written script to (potentially) be executed.
        watches (list): A list of watch expression objects the user has currently defined.
        message (str): A message received from stdin describing the edit to a file, in format
            "{EDIT_HEADER}{file_path}?{edit}"
            where the format of `edit` has not yet been defined.

    Returns:
        (bool): Whether execution should be performed.
    """
    file, edit = message.replace(EDIT_HEADER, '').split('?')
    # TODO handle caching
    return True


def _execute(exec_manager, script_path, watches):
    """Creates a new `_ExecutionManager` to run a given script, printing its watched variable schemas to stdout.

    If an `_ExecutionManager` already exists, it is first killed, so that only information from the most recent run
    is sent to the client.

    Args:
        exec_manager (_ExecutionManager or None): The existing `_ExecutionManager`, if one exists.
        script_path (str): Absolute path to the user-written script to be executed.
        watches (list): A list of watch expression dicts.

    Returns:
        (_ExecutionManager): A new manager which will run `script_path` and print its watched expressions.
    """
    if exec_manager:
        exec_manager.terminate()
    exec_manager = _ExecutionManager(script_path, watches)
    return exec_manager


def _fetch_symbol(exec_manager, message):
    """Fetches a symbol table slice containing the data of a requested symbol.

    Args:
        exec_manager (_ExecutionManager): The `_ExecutionManager` to which the request should be proxied.
        message (str): A string sent by the client to stdin of the format
            "{FETCH_HEADER}{symbol_id}?{actions}"
            where `actions` is the JSON string of an action dict, as described in `ACTION-SCHEMA.md`.
    """
    contents = message.replace(FETCH_HEADER, '').split('?')
    symbol_id = contents[0]
    actions = json.loads(contents[1])

    exec_manager.fetch_symbol(symbol_id, actions)


# ======================================================================================================================
# Main loop.
# ----------
# Associate the engine with a script path given in the command line and then wait for and process requests written by
# the client to stdin.
# ======================================================================================================================

def _read_args():
    """Read the path to the user-written script which should be executed by the engine from the command line.

    Returns:
        (str): absolute path to the script to be executed
    """
    parser = argparse.ArgumentParser()
    parser.add_argument('script', type=str)
    args = parser.parse_args()
    return args.script


def main():
    """Reads commands from the client and adds watch expressions, reruns the user's script, and fetches symbol data
    accordingly.

    The function runs on a loop until terminated, consuming inputs from stdin and performing actions based on the
    read inputs. None of the called functions are blocking, so the loop immediately returns to wait for the next
    message.
    """

    script_path = _read_args()
    exec_manager = None
    watches = []
    while True:
        message = input()
        if message.startswith(WATCH_HEADER):
            _add_watch(watches, message)
            exec_manager = _execute(exec_manager, script_path, watches)

        elif message.startswith(UNWATCH_HEADER):
            _remove_watch(watches, message)
            exec_manager = _execute(exec_manager, script_path, watches)

        elif message.startswith(EDIT_HEADER):
            if _should_execute(script_path, watches, message):
                _execute(exec_manager, script_path, watches)

        elif message.startswith(FETCH_HEADER):
            if exec_manager:
                _fetch_symbol(exec_manager, message)

        elif message.startswith(SHIFT_HEADER):
            _shift_watch(watches, message)

if __name__ == '__main__':
    main()
