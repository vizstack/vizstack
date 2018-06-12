import argparse
import threading
from multiprocessing import Process, Queue
from execute import run_script
import sys


THREAD_QUIT = 'quit'
WATCH_HEADER = 'watch:'
UNWATCH_HEADER = 'unwatch:'
ACTION_HEADER = 'action:'
EDIT_HEADER = 'change:'
FETCH_HEADER = 'fetch:'
SHIFT_HEADER = 'shift:'


class ExecutionManager:
    """Runs the user's Python script in a subprocess and prints requested symbol schemas to stdout.

    On creation, the `ExecutionManager` starts a new process and a new thread. The new process runs `execute.run_script()`,
    which in turn runs the user-written script within a Pdb instance. The symbol schemas produced by any evaluated
    watch expressions are added to a queue. The thread reads this queue, printing any schemas to stdout as they are
    added. Client programs, such as `repl.js`, can read these printed schemas.

    The thread is necessary to prevent blocking; otherwise, the engine would either have to block until script execution
    is done, preventing re-runs, or schemas would only be output after the process completes, which would produce long
    delays in longer scripts. The subprocess cannot write to stdout itself, so the thread must do so instead.

    Once the user-written script has executed, `execute.run_script()` waits for the user to request the data objects of
    additional symbols. Those requests are sent from `repl.js` to stdin, and then sent to the `ExecutionManager`, which
    adds the request to a queue that is read by `execute.run_script()`.
    """
    def __init__(self, script_path, watches):
        """Creates a process to execute the user-written script and a thread to read the returned schemas.

        Args:
            script_path (str): the absolute path to the user-written script to be executed
            watches (list): a list of watch statement objects, as produced by `get_watch_expression()`.
        """
        self.exec_process, self.print_queue, self.fetch_queue = ExecutionManager._start_exec_process(script_path, watches)
        self.print_thread = threading.Thread(target=ExecutionManager._start_print_thread, args=(self.exec_process,
                                                                                                self.print_queue))
        self.print_thread.start()

    def terminate(self):
        """Terminates the subprocess and the associated printing thread.

        The `ExecutionManager` is hereafter dead, and a new one should be created if another script must be run.
        """
        self.exec_process.terminate()
        self.print_queue.put(THREAD_QUIT)
        self.print_thread.join()

    def fetch_symbol(self, request_dict):
        """Fetches the data object for a symbol from the subprocess.

        The subprocess holds the ground-truth of all objects in the script's namespace, so requests must be forwarded
        to the process itself. These requests are only processed after the script has finished running, and reflect
        the value of symbols at the program's end.

        TODO: allow requests mid-execution?

        The fetched symbol schema is written to the `print_queue`, which is printed by the printing thread.

        Args:
            request_dict (dict): A dict encoding the request, as produced by `get_fetch_request()`.
        """
        self.fetch_queue.put(request_dict)

    @staticmethod
    def _start_exec_process(script_path, watches):
        """Starts a new process, which runs a user-written script inside of a Pdb instance.

        Two queues are created to communicate with the new process; one is filled by the subprocess with symbol schemas
        as they are encountered in watch statements or after they are requested by `fetch_symbol()`. The other queue is
        filled by the `ExecutionManager` with the IDs of symbols to be fetched.

        Args:
            script_path (str): the path to a user-written script to be executed in the subprocess.
            watches (list): a list of watch statement objects, as produced by `get_watch_expression()`.

        Returns:
            (Process, Queue, Queue): the handle to the subprocess, the queue filled with symbol schemas by the process,
                and the queue filled with requested symbol IDs by the `ExecutionManager`.
        """
        # TODO: escaping script_path
        fetch_queue = Queue()
        print_queue = Queue()
        process = Process(target=run_script, args=(fetch_queue, print_queue, script_path, watches))
        process.start()
        print_queue.get()  # gotta do this here once for some reason

        return process, print_queue, fetch_queue

    @staticmethod
    def _start_print_thread(process, print_queue):
        """Starts a new thread, which reads from a queue and prints any found strings.

        An `ExecutionManager` will create a print thread to pipe all schemas produced by its execution subprocess to
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
# Message translation.
# --------------------
# Functions to translate strings sent to stdin by clients (such as `repl.js`) into formats more easily used by the
# engine.
# ======================================================================================================================

def get_diff(message):
    """Translates a string which encodes a file change to an object describing that change.

    Clients such as `repl.js` send strings to the engine's stdin informing the engine of file changes. This function
    translates those strings to a more easily parsed format that can be used to determine if a re-run is needed.

    Args:
        message (str): a string of form 'EDIT_HEADER{file}?{edit}' (form of 'edit' is as of yet undefined)

    Returns:
        (dict) of form {file: str, edit: ?}
    """
    contents = message.replace(EDIT_HEADER, '').split('?')
    return {
        'file': contents[0],
        'edit': contents[1],
    }


def get_watch_expression(message):
    """Translates a string which encodes a watch expression to an object describing that watch expression.

    Clients such as `repl.js` send strings to the engine's stdin informing the engine of newly requested watch
    expressions. This functions translates those strings to a more easily parsed format that can be sent to execution
    subprocesses.

    Args:
        message (str): a string of form 'WATCH_HEADER{file}?{lineno}?{action}' (form of 'action' is as of yet undefined)

    Returns:
        (dict) of form {file: str, lineno: int, action: ?}
    """
    contents = message.replace(WATCH_HEADER, '').split('?')
    return {
        'file': contents[0],
        'lineno': int(contents[1]),
        'action': {
            pair.split(':')[0]: pair.split(':')[1] for pair in contents[2].split(';')[:-1]
        }
    }


def get_unwatch_expression(message):
    """Translates a string which encodes a unwatch expression to an object describing that unwatch expression.

    TODO document
    """
    contents = message.replace(UNWATCH_HEADER, '').split('?')
    return {
        'file': contents[0],
        'lineno': int(contents[1]),
    }


def get_fetch_request(message):
    """Translates a string which encodes a symbol data request to an object describing the request.

    Clients such as `repl.js` send strings to the engine's stdin informing the engine of requests for symbol data
    objects. This functions extracts the symbol ID from those strings.

    Args:
        message (str): a string of form 'FETCH_HEADER{symbol_id}?{recurse}'

    Returns:
        (dict) of form {symbolid: str, recurse: bool} TODO
    """
    # TODO: change to action format
    contents = message.replace(FETCH_HEADER, '').split('?')
    return {
        'symbolid': contents[0],
        'recurse': [] if len(contents[1]) == 0 else [path.split('/') for path in contents[1].split('+')],
    }


def get_watch_shift(message):
    """Translates a string which encodes a watch statement line shift to an object describing the shift.

    Args:
        message (str): A string of form 'SHIFT_HEADER{file}?{original_lineno}?{new_lineno}'

    Returns:
        (dict) of form {file: str, old_lineno: int, new_lineno: int}
    """
    contents = message.replace(SHIFT_HEADER, '').split('?')
    return {
        'file': contents[0],
        'old_lineno': int(contents[1]),
        'new_lineno': int(contents[2]),
    }


# ======================================================================================================================
# Watch expressions.
# ------------------
# Control how watch expressions are stored and toggled.
# ======================================================================================================================

def add_watch(watches, watch_expression):
    """Adds a new watch expression.

    Args:
        watches (list): A list of existing watch expressions, in the format returned by `get_watch_expression()`.
        watch_expression (dict): A watch expression, which should be `watches`. No other watch expression should be
            present at that line.

    """
    watches.append(watch_expression)


def remove_watch(watches, unwatch_expression):
    to_remove = [watch_expression for watch_expression in watches if watch_expression['file'] == unwatch_expression[
        'file'] and watch_expression['lineno'] == unwatch_expression['lineno']]
    for watch_expression in to_remove:
        watches.remove(watch_expression)


def update_watch(watches, update):
    for watch_expression in watches:
        if watch_expression['file'] == update['file'] and watch_expression['lineno'] == update['lineno']:
            watches['action'].update({update['action']})

        
def shift_watch(watches, shift):
    """Shifts the position of a watch expression to a new line.

    Watch expressions are hard-coded to point to a particular line number, which causes problems when new lines are
    inserted or old lines deleted. Allowing for shifts, as opposed to deleting and re-adding watch statements,
    prevents unnecessary re-executions.

    Args:
        watches (list): A list of existing watch expressions, in the format returned by `get_watch_expression()`.
        shift (dict): An object describing the line shift, in the format returned by `get_watch_shift()`.

    Returns:

    """
    for watch_expression in watches:
        if watch_expression['file'] == shift['file'] and watch_expression['lineno'] == shift['old_lineno']:
            watch_expression['lineno'] = shift['new_lineno']


# ======================================================================================================================
# Execution control.
# ------------------
# Determine whether the user-written script associated with the engine should be re-run, and do so.
# ======================================================================================================================

def should_execute(script_path, watches, diff):
    """Determines if a new execution is necessary to render information after a given edit to a file.

    Currently, we re-run regardless of the edit, but when we implement caching it should be done here.

    Args:
        script_path (str): the path to the user-written script to (potentially) be executed.
        watches (list): a list of watch expression objects the user has currently defined.
        diff (object): a diff object defining the change, as created by `get_diff()`.

    Returns:
        (bool) whether execution should be performed
    """
    # TODO handle caching
    return True


def execute(exec_manager, script_path, watches):
    """Creates a new `ExecutionManager` to run a given script, printing its watched variable schemas to stdout.

    If an `ExecutionManager` already exists, it is first killed, so that only information from the most recent run
    is sent to the client.

    Args:
        exec_manager (ExecutionManager or None): the existing `ExecutionManager`, if one exists
        script_path (str): absolute path to the user-written script to be executed
        watches (list): a list of watch expression objects, as created by `get_watch_expression()`

    Returns:
        (ExecutionManager) a new manager which will run `script_path` and print its watched expressions
    """
    if exec_manager:
        exec_manager.terminate()
    exec_manager = ExecutionManager(script_path, watches)
    return exec_manager


# ======================================================================================================================
# Main loop.
# ----------
# Associate the engine with a script path given in the command line and then wait for and process requests written by
# the client to stdin.
# ======================================================================================================================

def read_args():
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
    script_path = read_args()
    executor = None
    watches = []
    while True:
        message = input()
        if message.startswith(WATCH_HEADER):
            add_watch(watches, get_watch_expression(message))
            executor = execute(executor, script_path, watches)
        elif message.startswith(UNWATCH_HEADER):
            remove_watch(watches, get_unwatch_expression(message))
            executor = execute(executor, script_path, watches)
        elif message.startswith(ACTION_HEADER):
            # TODO: this
            pass
        elif message.startswith(EDIT_HEADER):
            if should_execute(script_path, watches, get_diff(message)):
                execute(executor, script_path, watches)
        elif message.startswith(FETCH_HEADER):
            if executor:
                executor.fetch_symbol(get_fetch_request(message))
        elif message.startswith(SHIFT_HEADER):
            shift_watch(watches, get_watch_shift(message))

if __name__ == '__main__':
    main()
