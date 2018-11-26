import json
import threading
import os
from multiprocessing import Queue
from typing import Mapping, Optional, Tuple

import execute
from xn.constants import ExpansionState

_RESET_MESSAGE: Mapping[str, Optional[bool]] = {
    'viewedVizId': None,
    'vizTableSlice': None,
    'shouldRefresh': True
}


class _RunScriptThread(threading.Thread):

    def __init__(self, receive_queue: Queue, send_queue: Queue, script_path: str) -> None:
        threading.Thread.__init__(self)
        self.receive_queue: Queue = receive_queue
        self.send_queue: Queue = send_queue
        self.script_path: str = script_path

    def run(self) -> None:
        execute.run_script(self.receive_queue, self.send_queue, self.script_path)


def _start_script_thread(script_path: str) -> Tuple[_RunScriptThread, Queue, Queue]:
    request_queue: Queue = Queue()
    output_queue: Queue = Queue()
    thread: _RunScriptThread = _RunScriptThread(request_queue, output_queue, script_path)
    thread.start()
    return thread, request_queue, output_queue


SCRIPT_ONE_WATCH: str = '../test/script_with_one_watch.py'
SCRIPT_ONE_WATCH_MULTIPLE_OBJECTS: str = '../test/script_with_one_watch_multiple_objects.py'
SCRIPT_ONE_WATCH_NO_OBJECTS: str = '../test/script_with_one_watch_no_objects.py'
SCRIPT_ERROR: str = '../test/script_with_error.py'
SCRIPT_PRINT: str = '../test/script_with_print.py'


def test_run_script_with_one_watch_should_send_refresh_request() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ONE_WATCH)
    request_queue.put(None)
    thread.join()
    assert _RESET_MESSAGE in [json.loads(output_queue.get()) for _ in range(output_queue.qsize())]


def test_run_script_with_one_watch_should_send_one_view_symbol() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ONE_WATCH)
    request_queue.put(None)
    thread.join()
    assert sum(
        [
            1 if json.loads(message)['viewedVizId'] is not None else 0
            for message in [output_queue.get() for _ in range(output_queue.qsize())]
        ]
    ) == 1


def test_run_script_with_one_watch_multiple_objects_should_send_multiple_view_symbols() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ONE_WATCH_MULTIPLE_OBJECTS)
    request_queue.put(None)
    thread.join()
    assert sum(
        [
            1 if json.loads(message)['viewedVizId'] is not None else 0
            for message in [output_queue.get() for _ in range(output_queue.qsize())]
        ]
    ) == 2


def test_run_script_with_one_watch_no_objects_should_send_no_view_symbols() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ONE_WATCH_NO_OBJECTS)
    request_queue.put(None)
    thread.join()
    assert sum(
        [
            1 if json.loads(message)['viewedVizId'] is not None else 0
            for message in [output_queue.get() for _ in range(output_queue.qsize())]
        ]
    ) == 0


def test_run_script_with_fetch_request_should_send_symbol_slice() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ONE_WATCH)
    for _ in range(3):
        symbol_slice_str: str = output_queue.get()
    request_queue.put(
        {
            'viz_id': json.loads(symbol_slice_str)['vizTableSlice'].popitem()[0],
            'expansion_state': ExpansionState.SUMMARY
        }
    )
    request_queue.put(None)
    thread.join()
    assert json.loads(output_queue.get())['vizTableSlice'] is not None


def test_run_script_with_error_should_send_traceback() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_ERROR)
    request_queue.put(None)
    thread.join()
    responses = [json.loads(output_queue.get()) for _ in range(output_queue.qsize())]
    # TODO: add check for file name, line number
    assert sum([response['viewedVizId'] is not None for response in responses]) == 1
    assert all(
        [
            os.path.basename(SCRIPT_ERROR) in response['vizTableSlice'][response['viewedVizId']]
            ['filePath'] for response in responses if response['viewedVizId'] is not None
        ]
    )


def test_run_script_with_print_should_send_text() -> None:
    thread, request_queue, output_queue = _start_script_thread(SCRIPT_PRINT)
    request_queue.put(None)
    thread.join()
    # TODO: add check for file name, line number
    assert any(
        [
            json.loads(response)['viewedVizId'] is not None
            for response in [output_queue.get() for _ in range(output_queue.qsize())]
        ]
    )
