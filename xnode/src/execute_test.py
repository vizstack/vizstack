import json
import threading
from multiprocessing import Queue
from typing import Sequence, Callable

import execute

_RESET_MESSAGE: str = json.dumps({'symbols': None, 'viewSymbol': None, 'refresh': True, 'text': None, 'error': None})


class _RunScriptThread(threading.Thread):
    def __init__(self,
                 receive_queue: Queue,
                 send_queue: Queue,
                 script_path: str) -> None:
        threading.Thread.__init__(self)
        self.receive_queue: Queue = receive_queue
        self.send_queue: Queue = send_queue
        self.script_path: str = script_path

    def run(self) -> None:
        execute.run_script(self.receive_queue, self.send_queue, self.script_path)


def _start_script_thread(script_path: str) -> (_RunScriptThread, Queue, Queue):
    request_queue: Queue = Queue()
    output_queue: Queue = Queue()
    thread: _RunScriptThread = _RunScriptThread(request_queue, output_queue, script_path)
    thread.start()
    return thread, request_queue, output_queue


def _end_thread_and_assert(request_queue: Queue,
                           thread: _RunScriptThread,
                           assertions: Sequence[Callable[[], bool]]) -> None:
    request_queue.put(None)
    thread.join()
    for assertion in assertions:
        assert assertion()


SCRIPT_ONE_WATCH: str = '../test/script_with_one_watch.py'
SCRIPT_ERROR: str = '../test/script_with_error.py'


def test_run_script_with_one_watch_should_send_refresh_request() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ONE_WATCH)
    _end_thread_and_assert(request_queue, thread,
                           [lambda: _RESET_MESSAGE in [output_queue.get() for _ in range(output_queue.qsize())]])


def test_run_script_with_fetch_request_should_send_symbol_slice() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ONE_WATCH)
    for _ in range(3):
        symbol_slice_str: str = output_queue.get()
    request_queue.put({'symbol_id': json.loads(symbol_slice_str)['symbols'].popitem()[0]})
    _end_thread_and_assert(request_queue, thread, [lambda: json.loads(output_queue.get())['symbols'] is not None])


def test_run_script_with_error_should_send_traceback() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ERROR)
    _end_thread_and_assert(request_queue, thread,
                           [lambda: any([json.loads(response)['error'] is not None for response in
                            [output_queue.get() for _ in range(output_queue.qsize())]])])
