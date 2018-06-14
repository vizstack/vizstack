import pdb
from os.path import normpath, normcase
from copy import deepcopy

from viz import VisualizationEngine


# Taken from atom-python-debugger
# TODO: check compliance w/ python 2, since it might not use Pdb.message()
# TODO: in-place changes are really going to fuck things up
# TODO: currently Pdb always breaks on the first line of the script
class ScriptExecutor(pdb.Pdb):
    """Runs a given script, producing symbol schemas for watched variables and sending them to a parent process.

    The `ScriptExecutor` is a modified `Pdb` instance; watch expressions are added as breakpoints. When such a
    breakpoint is encountered, the instance evaluates the variable at that line, creates a symbol schema for it,
    and sends it to the parent process as a string via a queue.
    """

    def __init__(self, schema_queue, **kwargs):
        pdb.Pdb.__init__(self, **kwargs)
        # Converts Python objects to viz schema format.
        self.viz_engine = VisualizationEngine()
        # The name of a variable whose value should be evaluated and transmitted at the next breakpoint. The program
        # only runs a line after any breakpoints at it have been passed, so when the Pdb breaks at a line,
        # it sets `var_to_eval` to the variable at that line, steps forward, and then evaluates the variable.
        self.var_to_eval = None
        # A queue shared with the parent process to which newly generated symbol schemas should be added.
        self.schema_queue = schema_queue
        # A set of all watched lines, so that whenever execution breaks the executor can determine whether to send
        # schema
        self.watch_lines = set()
        # A count of the number of encountered watch expressions, to be sent along with any returned messages so that
        # symbol freezing may be performed by clients.
        self.watch_count = 0

        self.watch_actions = dict()

        self.watching_line = None

        self.to_send = dict()

    # ==================================================================================================================
    # Public methods.
    # ----------------
    # Functions to add new watch expressions, execute a script, and then surface additional information objects in
    # the script's namespace.
    # ==================================================================================================================

    # TODO: these shouldn't be here
    @staticmethod
    def normalize_path(file_path):
        return normcase(normpath(file_path))

    @staticmethod
    def format_actions(actions):
        formatted = {}
        for action in actions:
            if action == 'recurse':
                formatted[action] = [path.split('/') for path in actions['recurse'].split('+')]
        for action in ['recurse']:
            if action in formatted:
                continue
            if action == 'recurse':
                formatted[action] = []
        return formatted

    def add_watch_expression(self, file_path, lineno, actions):
        """Adds a watch expression to a particular line of code, causing any variable assigned in that line to be
        surfaced to the client.

        The watch expression is manifested as a `Pdb` breakpoint. Execution will stop at that line, then the variable
        will be evaluated and its symbol schema written to `self.schema_queue`.

        No behavior will change if the watched line is not executed during the running of the main script.

        Args:
            file_path (str): The absolute path to the file.
            lineno (int): The line number of the variable assignment in that file.
            actions (?): To be used for more complex watch expressions.
        """
        file_path = ScriptExecutor.normalize_path(file_path)
        self.watch_lines.add((file_path, lineno))
        self.do_break('{}:{}'.format(file_path, lineno))
        self.watch_actions[(file_path, lineno)] = ScriptExecutor.format_actions(actions)

    def execute(self, script_path):
        """Execute a script within the `ScriptExecutor` instance, allowing its flow to be controlled by the instance.

        `execute()` should be called only once per `ScriptExecutor` instance, as its behavior is unknown after
        multiple runs.

        Args:
            script_path (str): The absolute path to the user-written script to be executed.
        """
        # Send the refresh request
        self._setup_message(True, -1)
        self._send_message()
        self._runscript(script_path)

    # TODO: fetch actions, recursion, etc
    def fetch_symbol_data(self, request_dict):
        """Fetches the data object for a symbol, as well as the shells of all symbols it references.

        Typically called from the `run_script()` loop after the `ScriptExecutor` has finished running the main
        script, when the client, such as `repl.js`, has requested more information about a symbol.

        The symbol with given ID is expected to exist as a shell within `self.viz_engine`.

        Args:
            request_dict (dict): An object of the form returned by `engine.get_fetch_request()`.

        Returns:
            (object) of form {data: {data object}, shells: {symbol id: shell}}
        """
        self._setup_message(False, -1)
        symbol_id = request_dict['symbol_id']
        shells = self.viz_engine.get_symbol_shell_by_id(symbol_id)
        symbol_slice = self._get_symbol_slice(symbol_id, shells)
        self._add_schema(symbol_slice)
        self._send_message()

    # ==================================================================================================================
    # Watch expression logic.
    # -----------------------
    # Functions that acquire Python objects from the executing script at breakpoints and surface their viz schema
    # objects.
    # ==================================================================================================================

    def _handle_break(self, frame):
        self._setup_message(False, self.watch_count)
        symbol_id, symbols = self._get_schema_obj(self.var_to_eval, frame)
        self._view_symbol(symbol_id)
        self._add_schema(symbols)
        self._handle_recurse(symbol_id)
        self._send_message()
        self.watch_count += 1

    # Action: recursion.
    # --------------------------------

    # first symbol already loaded
    # follow path
    # if found,
    def _handle_recurse(self, symbol_id):
        self._recurse_add(symbol_id, self.watch_actions[self.watching_line]['recurse'], set())

    @staticmethod
    def _flatten_list(l):
        l = deepcopy(l)
        while l:
            sublist = l.pop(0)
            if isinstance(sublist, list):
                l = sublist + l
            else:
                yield sublist

    def _recurse_add(self, symbol_id, recurse_paths, added):
        for recurse_path in recurse_paths:
            pointing_to = self.to_send['symbols'][symbol_id]['data']
            for key in recurse_path:
                if key in pointing_to:
                    pointing_to = pointing_to[key]
                else:
                    pointing_to = None
                    break
            if pointing_to is None:
                continue
            if self._is_symbol_id(pointing_to):
                self._recurse_symbol(pointing_to, recurse_paths, added)
            elif isinstance(pointing_to, list):
                pointing_to = ScriptExecutor._flatten_list(pointing_to)
                for item in pointing_to:
                    self._recurse_symbol(item, recurse_paths, added)
            elif isinstance(pointing_to, dict):
                for value in pointing_to.values():
                    self._recurse_symbol(value, recurse_paths, added)

    def _is_symbol_id(self, s):
        return isinstance(s, str) and s.startswith('@id:')

    def _recurse_symbol(self, symbol_id, recurse, added):
        if not self._is_symbol_id(symbol_id) or symbol_id in added:
            return
        added.add(symbol_id)
        data, refs, attributes = self.viz_engine.get_symbol_data(symbol_id)
        for key, value in refs.items():
            if key not in self.to_send['symbols']:
                self.to_send['symbols'][key] = value
        self.to_send['symbols'][symbol_id]['data'] = data
        self.to_send['symbols'][symbol_id]['attributes'] = attributes
        self._recurse_add(symbol_id, recurse, added)

    # ==================================================================================================================

    # TODO: please for the love of God clean this

    def _send_message(self):
        self.schema_queue.put(self.viz_engine.to_json(self.to_send))
        self.to_send = dict()
        self.var_to_eval = None

    def _view_symbol(self, symbol_id):
        self.to_send['viewSymbol'] = symbol_id

    def _add_schema(self, symbols):
        self.to_send['symbols'].update(symbols)

    # TODO !!: view_symbol
    def _setup_message(self, refresh, watch_count):
        self.to_send = {
            'symbols': {},
            'viewSymbol': None,
            'refresh': refresh,
            'watchCount': watch_count
        }

    def _get_var_from_frame(self, frame):
        """Gets the name of the variable being assigned to at the line being executed in the given frame.

        This function is called when a watch expression's breakpoint is first hit, extracting the variable name from
        that line. That name is stored in `self.var_to_eval`, and its value is evaluated after the line executes.

        Raises a `ValueError` if no variable is being assigned at that line.

        Args:
            frame (object): A `Pdb` frame object which contains the text of the current line being executed.

        Returns:
            (str): The name of the variable assigned to in the line being executed in `frame`.
        """
        return self._get_var_from_line(self._get_line_from_frame(frame))

    def _get_symbol_slice(self, symbol_id, shell):
        data, refs, attributes = self.viz_engine.get_symbol_data(symbol_id)
        refs.update({symbol_id: shell})
        refs[symbol_id]['data'] = data
        refs[symbol_id]['attributes'] = attributes
        return refs

    # TODO: update documentation to reflect that this returns a str
    def _get_schema_obj(self, var_name, frame):
        """Creates an object with the schema for `var_name` evaluated at `frame`, as well as shells for all
        referenced objects.

        Raises `ValueError` if `var_name` cannot be found in `frame`.

        Args:
            var_name (str): The name of the variable to be evaluated.
            frame (object): A `Pdb` frame object which contains the value of `var_name`.

        Returns:
            (dict): A dict of form {'data': shell with filled data field, 'shells': {symbol_id: shell}}
        """
        obj = None
        obj_found = False
        if var_name in frame.f_locals:
            obj = frame.f_locals[var_name]
            obj_found = True
        elif var_name in frame.f_globals:
            obj = frame.f_globals[var_name]
            obj_found = True
        if obj_found:
            symbol_id, shell = self.viz_engine.get_symbol_shell(obj, name=var_name)
            symbol_slice = self._get_symbol_slice(symbol_id, shell)
            return symbol_id, symbol_slice
        else:
            raise ValueError

    def _get_file_lineno_from_frame(self, frame):
        self.current_stack, self.current_stack_index = self.get_stack(frame, None)
        frame, lineno = self.current_stack[self.current_stack_index]
        # TODO don't use format_stack_entry, use a custom function instead to eliminate the split-join
        stack_entry = self.format_stack_entry((frame, lineno))
        return ScriptExecutor.normalize_path(stack_entry.split('(')[0]), int(stack_entry.split('(')[1].split(')')[0])

    def _get_line_from_frame(self, frame):
        """Gets a string version of the line being executed at the given frame.

        Args:
            frame (object): A `Pdb` frame object that contains the line to be returned.

        Returns:
            (str): The text of the line being executed at `frame`.
        """
        self.current_stack, self.current_stack_index = self.get_stack(frame, None)
        frame, lineno = self.current_stack[self.current_stack_index]
        # TODO don't use format_stack_entry, use a custom function instead to eliminate the split-join
        stack_entry = self.format_stack_entry((frame, lineno))
        return ':'.join(stack_entry.split('():')[1:]).strip()

    # TODO: improve parser
    def _get_var_from_line(self, line):
        """Extracts the string name of a variable being assigned to in the given line.

        Raises a `ValueError` if there is no assignment occurring at the line.

        Args:
            line (str): The text of the line to be extracted.

        Returns:
            (str): The name of the variable being assigned to at the given line.
        """
        has_hit_space = False
        var_name = ''
        for c in line:
            if c.isalpha() or c.isdigit():
                if has_hit_space:
                    raise ValueError
                var_name += c
            elif c == ' ':
                has_hit_space = True
                continue
            elif c == '=':
                return var_name
            else:
                raise ValueError
        raise ValueError

    # ==================================================================================================================
    # `pdb` overrides.
    # ----------------
    # `pdb` calls these functions at various points during the execution of a script, allowing us to inject our own
    # logic at breakpoints.
    # ==================================================================================================================

    # TODO: document this new hell of breaks, steps, nexts, and continues
    def user_return(self, frame, return_value):
        """Called whenever a function returns where the program execution has stopped.

        A breakpoint at a return should only have been set by `user_line()`, meaning the value of `self.var_to_eval`
        is non-None. Thus, a schema object should be created for it and printed to stdout.

        Args:
            frame (object): A `Pdb` object encapsulating the script's current execution state.
            return_value (object): The return value of the function.
        """
        if self.var_to_eval is None:
            self.do_continue(frame)
        elif self.var_to_eval in frame.f_locals or self.var_to_eval in frame.f_globals:
            self._handle_break(frame)
            self.do_continue(frame)
        else:
            self.do_step(frame)

    def user_line(self, frame):
        """Called whenever a line of code is hit where program execution has stopped.

        If the breakpoint was specified as a watch statement, then the variable being assigned at the current
        line is extracted and assigned to `self.var_to_eval`. Execution is then set to stop at the next line,
        when that variable will have been assigned.

        If the breakpoint was set by a previous call to `user_line()`, then the schema object of `self.var_to_eval` is
        created and sent to stdout.

        Args:
            frame (object): A `Pdb` object encapsulating the script's current execution state.
        """
        if self.var_to_eval is not None:
            if self.var_to_eval in frame.f_locals or self.var_to_eval in frame.f_globals:
                self._handle_break(frame)
                self.do_continue(frame)
            else:
                self.do_step(frame)
        if self._get_file_lineno_from_frame(frame) in self.watch_lines:
            try:
                self.var_to_eval = self._get_var_from_frame(frame)
                self.watching_line = self._get_file_lineno_from_frame(frame)
                self.do_next(frame)
            except ValueError:
                self.var_to_eval = None
                self.do_continue(frame)
        # else:
        #     self.do_continue(frame)

    # `message` and `error` are called by `Pdb` to write to the respective streams. We block those messages so that
    # only object info will be sent to stdout, and thus read by the engine.
    def message(self, msg):
        pass

    def error(self, msg):
        pass

    # TODO: what do these do?
    def precmd(self, line):
        return line

    def postcmd(self, stop, line):
        return stop


# ======================================================================================================================
# Public methods.
# ---------------
# Methods to be called by clients that want to run a Python script and receive schema representations of objects in
# its namespace.
# ======================================================================================================================

def run_script(receive_queue, send_queue, script_path, watches):
    """Runs a given script, writing the value of watched variables to a queue and then writing the values of
    additional variables requested by a client to another queue.

    The given script is executed to completion; afterwards, symbol IDs are read on a loop from `receive_queue`.
    The data objects for these symbols, as well as the shells of symbols they reference, are written as JSON strings
    to `send_queue`.

    Should be called as the main function of a new process.

    Args:
        receive_queue (Queue): A queue shared with the calling process to which requests for new symbol schemas are
            written by the parent.
        send_queue (Queue): A queue shared with the calling process to which this process writes symbol schema strings.
        script_path (str): The absolute path to a user-written script to be executed.
        watches (list): A list of watch expression objects of form {'file': str, 'lineno': str, 'action': ?}.

    """
    send_queue.put('wat')  # gotta send some junk once for some reason
    executor = ScriptExecutor(send_queue)
    for watch in watches:
        executor.add_watch_expression(watch['file'], watch['lineno'], watch['action'])
    executor.execute(script_path)
    while True:
        request = receive_queue.get(True)
        executor.fetch_symbol_data(request)
