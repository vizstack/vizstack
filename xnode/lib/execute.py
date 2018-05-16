import pdb
from os.path import normpath, normcase

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

    # ==================================================================================================================
    # Public methods.
    # ----------------
    # Functions to add new watch expressions, execute a script, and then surface additional information objects in
    # the script's namespace.
    # ==================================================================================================================

    def add_watch_expression(self, file_path, lineno, action=None):
        """Adds a watch expression to a particular line of code, causing any variable assigned in that line to be
        surfaced to the client.

        The watch expression is manifested as a `Pdb` breakpoint. Execution will stop at that line, then the variable
        will be evaluated and its symbol schema written to `self.schema_queue`.

        No behavior will change if the watched line is not executed during the running of the main script.

        Args:
            file_path (str): The absolute path to the file.
            lineno (int): The line number of the variable assignment in that file.
            action (?): To be used for more complex watch expressions.
        """
        self.watch_lines.add((normcase(normpath(file_path)), lineno))
        self.do_break('{}:{}'.format(normcase(normpath(file_path)), lineno))

    def execute(self, script_path):
        """Execute a script within the `ScriptExecutor` instance, allowing its flow to be controlled by the instance.

        `execute()` should be called only once per `ScriptExecutor` instance, as its behavior is unknown after
        multiple runs.

        Args:
            script_path (str): The absolute path to the user-written script to be executed.
        """
        self.schema_queue.put(self._schema_to_message(None, None, None, True))
        self._runscript(script_path)

    def fetch_symbol_data(self, symbol_id):
        """Fetches the data object for a symbol, as well as the shells of all symbols it references.

        Typically called from the `run_script()` loop after the `ScriptExecutor` has finished running the main
        script, when the client, such as `repl.js`, has requested more information about a symbol.

        The symbol with given ID is expected to exist as a shell within `self.viz_engine`.

        Args:
            symbol_id (str): the ID of the requested symbol

        Returns:
            (object) of form {data: {data object}, shells: {symbol id: shell}}
        """
        data, shells = self.viz_engine.get_symbol_data(symbol_id)
        return self._schema_to_message(shells, data, symbol_id)

    # ==================================================================================================================
    # Watch expression logic.
    # -----------------------
    # Functions that acquire Python objects from the executing script at breakpoints and surface their viz schema
    # objects.
    # ==================================================================================================================

    def _send_schema(self, frame):
        """Creates a schema object for the variable with name stored in `self.var_to_eval` and writes it to the
        parent process.

        When the breakpoint set for a watch expression is hit, this function is not called, because the variable
        assigned at that line will not have been evaluated yet. Instead, `self.var_to_eval` is set at that line,
        and a new breakpoint is added at the subsequent line. Program execution continues, and when that next line is
        hit, `_send_schema()` will be called.

        Args:
            frame (object): A `Pdb` frame object which contains the values of all variables in the script's namespace.

        """
        self.schema_queue.put(self._get_schema_obj(self.var_to_eval, frame))
        self.var_to_eval = None

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
            data, refs = self.viz_engine.get_symbol_data(symbol_id)
            refs.update({symbol_id: shell})
            return self._schema_to_message(refs, data, symbol_id)
        else:
            raise ValueError

    def _schema_to_message(self, shells, data, symbol_id, refresh=False):
        return self.viz_engine.to_json({
            'shells': shells,
            'data': data,
            'dataSymbolId': symbol_id,
            'refresh': refresh,
        })

    def _get_file_lineno_from_frame(self, frame):
        self.current_stack, self.current_stack_index = self.get_stack(frame, None)
        frame, lineno = self.current_stack[self.current_stack_index]
        # TODO don't use format_stack_entry, use a custom function instead to eliminate the split-join
        stack_entry = self.format_stack_entry((frame, lineno))
        return normcase(normpath(stack_entry.split('(')[0])), int(stack_entry.split('(')[1].split(')')[0])

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

    def user_return(self, frame, return_value):
        """Called whenever a function returns where the program execution has stopped.

        A breakpoint at a return should only have been set by `user_line()`, meaning the value of `self.var_to_eval`
        is non-None. Thus, a schema object should be created for it and printed to stdout.

        Args:
            frame (object): A `Pdb` object encapsulating the script's current execution state.
            return_value (object): The return value of the function.
        """
        self._send_schema(frame)
        self.do_continue(frame)

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
        # self._get_file_lineno_from_frame(frame)
        if self.var_to_eval is not None:
            self._send_schema(frame)
        if self._get_file_lineno_from_frame(frame) in self.watch_lines:
            try:
                self.var_to_eval = self._get_var_from_frame(frame)
                self.do_next(frame)
            except ValueError:
                self.var_to_eval = None
                self.do_continue(frame)
        else:
            self.do_continue(frame)

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
        symbol_id = receive_queue.get(True)
        send_queue.put(executor.fetch_symbol_data(symbol_id))
