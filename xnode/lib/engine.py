import argparse
import subprocess
import threading


class Executor:
    def __init__(self, script_path, watches):
        self.shell_process = self._start_process(script_path, watches)
        self.read_thread = threading.Thread(target=Executor._start_thread, args=(self.shell_process,))
        self.read_thread.start()

    def terminate(self):
        self.shell_process.terminate()
        self.read_thread.join()

    def fetch_symbol(self, symbol_id):
        self.shell_process.stdin.write(symbol_id + '\n')
        self.shell_process.stdin.flush()

    def _start_process(self, script_path, watches):
        # TODO: escaping script_path
        process = subprocess.Popen(['python', 'execute.py'] + watches + ['--script', script_path],
                                   stdout=subprocess.PIPE,
                                   stdin=subprocess.PIPE, universal_newlines=True)
        return process

    @staticmethod
    def _start_thread(process):
        while process.poll() is None:
            l = process.stdout.readline()
            if len(l) > 0:
                print(l)  # blocks
        l = process.stdout.read()
        if len(l) > 0:
            print(l)


def get_diff(message):
    contents = message.replace('change:', '').split('?')
    return {
        'file': contents[0],
        'edit': contents[1],
    }


def get_symbol_id(message):
    return message.replace('fetch:', '')


def should_execute(script_path, watches, diff):
    # TODO handle caching
    return True


def execute(executor, script_path, watches):
    if executor:
        executor.terminate()
    executor = Executor(script_path, watches)
    return executor


def read_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('script', type=str, dest='script')
    args = parser.parse_args()
    return args.script


def main():
    script_path = '../dummy.py'  # read_args()
    executor = None
    watches = []
    while True:
        message = input()
        # TODO add unwatch
        if message.startswith('watch:'):
            watches.append(message)
            executor = execute(executor, script_path, watches)
        elif message.startswith('change:'):
            if should_execute(script_path, watches, get_diff(message)):
                execute(executor, script_path, watches)
        elif message.startswith('fetch:'):
            if executor:
                executor.fetch_symbol(get_symbol_id(message))

if __name__ == '__main__':
    main()
