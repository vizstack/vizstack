import json
import pdb
import sys
import traceback
import re
from os.path import normpath, normcase

from viz import VisualizationEngine


# TODO: check compliance w/ python 2, since it might not use Pdb.message()


# Taken from atom-python-debugger
class _ScriptExecutor(pdb.Pdb):
    """Runs a given script, producing symbol schemas for watched variables and sending them to a parent process.

    The `_ScriptExecutor` is a modified `Pdb` instance; watch expressions are added as breakpoints. When such a
    breakpoint is encountered, the instance identifies which variable is being assigned to at that line, waits for it to
    be evaluated, creates a symbol schema for it, and sends it to the parent process as a string via a queue.

    Args:
        send_message (fn): A function with signature (symbol_slice, view_symbol_id, refresh, watch_id, error) that
            should be called to send a message containing execution state info and instructions to the client.
    """

    def __init__(self, send_message, **kwargs):
        pdb.Pdb.__init__(self, **kwargs)
        # Converts Python objects to viz schema format.
        self._viz_engine = VisualizationEngine()
        # A function that is called when a message should be sent to the client.
        self._send_message = send_message
        # A mapping of (file_name, line_number) tuples to dictionaries that describe what actions should be performed
        # at which watched lines.
        self._watch_actions = dict()

        self._watch_ids = dict()
        # The name of a variable that should be evaluated once defined in the running program's stack frame.
        self._var_to_eval = None
        # A dictionary describing the actions to be performed when the variable in `self._var_to_eval` is evaluated.
        self._actions_on_eval = None

        self._eval_id = None

    # ==================================================================================================================
    # Public methods.
    # ----------------
    # Functions to add new watch expressions, execute a script, and then surface additional information objects in
    # the script's namespace.
    # ==================================================================================================================

    def add_watch_expression(self, watch_id, file_path, lineno, actions):
        """Adds a watch expression to a particular line of code, causing any variable assigned in that line to be
        surfaced to the client.

        When the line is evaluated, the actions described in `actions` are executed.

        No behavior will change if the watched line is not executed during the running of the main script.

        Args:
            watch_id (int): A unique ID for this watch statement.
            file_path (str): The absolute path to the file.
            lineno (int): The line number of the variable assignment in that file.
            actions (dict): A dict describing the actions to _execute at the watched line, of format described in
                `ACTION-SCHEMA.md`.
        """
        file_path = _ScriptExecutor._normalize_path(file_path)
        self.do_break('{}:{}'.format(file_path, lineno))
        self._watch_ids[(file_path, lineno)] = watch_id
        self._watch_actions[(file_path, lineno)] = actions

    def execute(self, script_path):
        """Execute a script within the `_ScriptExecutor` instance, allowing its flow to be controlled by the instance.

        `_execute()` should be called only once per `_ScriptExecutor` instance, as its behavior is unknown after
        multiple runs.

        Args:
            script_path (str): The absolute path to the user-written script to be executed.
        """
        # Send a message to refresh the client's symbol table
        # TODO: is this even necessary? maybe the client can do this itself.
        self._prepare_and_send_message(None, None, None, True, -1, None)
        self._runscript(_ScriptExecutor._normalize_path(script_path))

    def fetch_symbol_data(self, symbol_id, actions):
        """Fetches a symbol slice containing the symbol with id `symbol_id` and sends it to the client.

        Typically called from the `run_script()` loop after the `_ScriptExecutor` has finished running the main
        script, when the client, such as `repl.js`, has requested more information about a symbol.

        Also performs the actions described in `actions` on the fetched symbol.

        Args:
            symbol_id (str): The symbol ID of the object to be fetched.
            actions (dict): A dict describing the actions to be performed on the fetched symbol, of format described
                in `ACTION-SCHEMA.md`.
        """
        self._prepare_and_send_message(symbol_id, None, None, False, -1, actions)

    # ==================================================================================================================
    # Message creation and sending.
    # -----------------------------
    # Functions to generate and relay messages containing new symbol slices to be added to the symbol table.
    # ==================================================================================================================

    def _prepare_and_send_message(self, symbol_id, symbol_name, view_symbol_id, refresh, watch_id, actions):
        """Creates and sends a message to the client containing new symbol table information.

        Args:
            symbol_id (str or None): The symbol whose shell, data object, and references should be included in the sent
                slice.
            symbol_name (str or None): A string name given to `view_symbol_id` in the namespace, or `None` if
                there is no `view_symbol_id` or the symbol has no name.
            view_symbol_id (str or None): A symbol ID that the client should view upon receiving the message, or `None`
                if no symbol should be viewed.
            refresh (bool): Whether the client should reset its symbol table information before incorporating the new
                slice.
            watch_id (int): An integer unique to the watch statement whose information is being sent, or -1 if the
                message is not associated with a watch statement.
            actions (dict or None): A dict of actions to be performed on the given symbol slice before returning,
                in the form described in `ACTION-SCHEMA.md`.
        """
        symbol_slice = None
        if symbol_id:
            symbol_slice = self._get_symbol_slice(symbol_id, symbol_name)
            if actions:
                self._action_recurse(symbol_id, symbol_slice, actions['recurse'], set())
        self._send_message(symbol_slice, view_symbol_id, refresh, watch_id, None, None)

    def _get_symbol_slice(self, symbol_id, symbol_name):
        """Generates the minimal symbol table slice containing the filled shell of `symbol_id`.

        Args:
            symbol_id (str): A symbol ID whose minimal slice should be generated.
            symbol_name (str or None): A string name assigned to the symbol in the namespace, or `None` if no name is
                assigned.

        Returns:
            (dict): The symbol table slice containing the shell and data for `symbol_id` as well as the shells of all
                referenced symbols.
        """
        shell = self._viz_engine.get_symbol_shell(symbol_id, symbol_name)
        data, attributes, refs = self._viz_engine.get_symbol_data(symbol_id)
        refs.update({symbol_id: shell})
        refs[symbol_id]['data'] = data
        refs[symbol_id]['attributes'] = attributes
        return refs

    # Action: recursion.
    # ------------------

    def _action_recurse(self, symbol_id, symbol_slice, recurse_paths, added):
        """Adds any symbols referenced at a particular path in a symbol's data object to `symbol_slice`,
        and continues doing so recursively for all symbols found this way.

        Failing to follow a path does not result in an exception or an error, so paths can be included that cannot be
        found in all data objects.

        Operates in-place on `symbol_slice`.

        Args:
            symbol_id (str): The ID of the symbol whose data object should be examined.
            symbol_slice (dict): The symbol table slice containing the data object of `symbol_id` and to which new
                symbols should be added.
            recurse_paths (list): A list of lists, where each sublist is a sequence of strings indicating a path to
                follow in the data object.
            added (set): The set of all symbol IDs already added to the symbol table via this action.
        """
        for recurse_path in recurse_paths:
            pointing_to = self._follow_recurse_path(symbol_slice[symbol_id]['data'], recurse_path)
            found_symbol_ids = self._find_symbol_ids(pointing_to, [])
            for found_symbol_id in found_symbol_ids:
                self._add_and_recurse(found_symbol_id, symbol_slice, recurse_paths, added)

    def _follow_recurse_path(self, symbol_data, recurse_path):
        """Returns the value found by following a particular sequence of keys in `symbol_data`.

        Args:
            symbol_data (dict): A dict, possibly nested, to be explored along `recurse_path`.
            recurse_path (list): A sequence of string keys to be followed within `symbol_data`.

        Returns:
            (list or str or dict or None): The item found at the end of the path, or None if the path cannot be
                followed.
        """
        pointing_to = symbol_data
        assert pointing_to is not None
        for key in recurse_path:
            if key in pointing_to:
                pointing_to = pointing_to[key]
            else:
                pointing_to = None
                break
        return pointing_to

    def _find_symbol_ids(self, obj, found):
        """Finds all symbol IDs located at any level of depth in a given object.

        Operates recursively on all subitems if `obj` is a `list`, or over all values if `obj` is a `dict`.

        Args:
            obj (list or dict or str): The object to search for symbol ID strings.
            found (list): A list to be updated with any found symbol ID strings.

        Returns:
            (list): The list of all found symbol ID strings within `obj`.
        """
        if self._viz_engine.is_symbol_id(obj):
            # if pointing to a symbol id, add it
            found.append(obj)

        elif isinstance(obj, list):
            # if pointing to a list, recurse over its elements
            for item in obj:
                self._find_symbol_ids(item, found)

        elif isinstance(obj, dict):
            # if pointing to a dict, recurse over its values
            for value in obj.values():
                self._find_symbol_ids(value, found)

        return found

    def _add_and_recurse(self, symbol_id, symbol_slice, recurse_paths, added):
        """Adds the data object and referenced symbol shells of a symbol to the given slice, then repeats for any
        symbols within the data object and pointed to by `recurse_paths`.

        Args:
            symbol_id (str): The ID of the symbol whose data object should be added to `symbol_slice`.
            symbol_slice (dict): The slice of the symbol table to which the new data object and shells should be added.
            recurse_paths (list): See `_action_recurse()` for description.
            added (set): See `_action_recurse()` for description.

        Returns:

        """
        if symbol_id in added:
            return
        added.add(symbol_id)
        data, attributes, refs = self._viz_engine.get_symbol_data(symbol_id)
        for key, value in refs.items():
            if key not in symbol_slice:
                symbol_slice[key] = value
        symbol_slice[symbol_id]['data'] = data
        symbol_slice[symbol_id]['attributes'] = attributes
        self._action_recurse(symbol_id, symbol_slice, recurse_paths, added)

    # ==================================================================================================================
    # Variable evaluation.
    # --------------------
    # Extract the variable being assigned in a program line and evaluate it once the line has been executed.
    # ==================================================================================================================

    # Setup and execution.
    # --------------------

    def _prepare_to_eval(self, assign_frame):
        """Prepare to evaluate the variable being assigned to in `assign_frame` once it has been assigned.

        Since the variable is not actually assigned until the next step occurs, its value cannot be immediately
        evaluated. Thus, `_prepare_to_eval()` stores the variable name internally until `_eval()` is called,
        at which point the value of the variable is evaluated.

        Args:
            assign_frame (Frame): A `Pdb` frame object describing the program's stack frame at a line where a
                variable is being assigned.
        """
        self._eval_id = self._watch_ids[self._get_file_lineno(assign_frame)]
        self._actions_on_eval = self._watch_actions[self._get_file_lineno(assign_frame)]
        self._var_to_eval = self._get_var_name_from_frame(assign_frame)

    def _eval(self, eval_frame):
        """Evaluates the variable stored in `_prepare_to_eval()`, producing its Python object, variable name,
        and associated symbol request actions.

        Should be called only after `_prepare_to_eval()`.

        Args:
            eval_frame (Frame): A `Pdb` frame object describing the program's stack frame at a line where a variable
                should be evaluated.

        Raises:
            ValueError: If the variable assigned to in `assign_frame` cannot be found in `eval_frame`,
                or `prepare_to_eval()` was not called before `eval()`.

        Returns:
            (object): The object that was assigned to the variable name in `assign_frame`.
            (str): The name of the variable which references the object.
            (int): An ID unique to this watch statement.
            (dict): Symbol request actions the client has associated with the variable's evaluation.
        """
        obj_name = self._var_to_eval
        obj = None
        obj_found = False
        if obj_name in eval_frame.f_locals:
            obj = eval_frame.f_locals[obj_name]
            obj_found = True
        elif obj_name in eval_frame.f_globals:
            obj = eval_frame.f_globals[obj_name]
            obj_found = True

        self._var_to_eval = None
        if obj_found:
            return obj, obj_name, self._eval_id, self._actions_on_eval
        raise ValueError

    # State checking.
    # ---------------

    def _is_waiting_to_eval(self):
        """Returns `True` if `prepare_to_eval()` has been called since the last `eval()`.

        When hitting a breakpoint, the `_ScriptExecutor` must know if it should evaluate some variable at that
        breakpoint, which is indicated by the value of this function.

        Returns:
            (bool): Whether the `_VariableEvaluator` has prepared to evaluate a variable, but has not evaluated it.
        """
        return self._var_to_eval is not None

    def _can_eval(self, frame):
        """Returns `True` if the given frame has a defined value for the variable stored in `prepare_to_eval()`.

        After hitting a watch expression and calling `prepare_to_eval()`, the `_ScriptExecutor` steps until it finds a
        frame that can be used to call `eval()`. This function only returns `True` on such frames.

        Args:
            frame (Frame): A `Pdb` frame object describing the program's stack frame.

        Returns:
            (bool): Whether `frame` has a definition for the variable assigned in `prepare_to_eval()`.
        """
        return self._var_to_eval in frame.f_locals or self._var_to_eval in frame.f_globals

    # Frame operations.
    # -----------------

    def _get_var_name_from_frame(self, frame):
        """Gets the name of the variable being assigned to at the line being executed in the given frame.

        Currently can only handle lines where a single variable is assigned and is not deconstructed.

        Args:
            frame (object): A `Pdb` frame object which contains the text of the current line being executed.

        Raises:
            ValueError: If the line is anything but a single variable being assigned to some expression.

        Returns:
            (str): The name of the variable assigned to in the line being executed in `frame`.
        """
        line_text = self._get_line_from_frame(frame)

        # TODO: improve parser
        has_hit_space = False
        var_name = ''
        for c in line_text:
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

    def _get_line_from_frame(self, frame):
        """Gets the text of the line being executed at the given frame.

        Args:
            frame (object): A `Pdb` frame object that describes the program's stack frame.

        Returns:
            (str): The text of the line being executed at the top of `frame`.
        """
        self.current_stack, self.current_stack_index = self.get_stack(frame, None)
        frame, lineno = self.current_stack[self.current_stack_index]
        # TODO: don't use format_stack_entry, use a custom function instead to eliminate the split-join
        stack_entry = self.format_stack_entry((frame, lineno))
        return ':'.join(stack_entry.split('():')[1:]).strip()

    def _get_file_lineno(self, frame):
        """Returns the number of the line being executed in the given frame, as well as the file that contains it.

        Args:
            frame (Frame): A `Pdb` frame object that describes the program's stack frame.

        Returns:
            (string, int): The file and line number being executed.
        """
        self.current_stack, self.current_stack_index = self.get_stack(frame, None)
        frame, lineno = self.current_stack[self.current_stack_index]
        # TODO: don't use format_stack_entry, use a custom function instead to eliminate the split-join
        stack_entry = self.format_stack_entry((frame, lineno))
        return _ScriptExecutor._normalize_path(stack_entry.split('(')[0]), int(stack_entry.split('(')[1].split(')')[0])

    # ==================================================================================================================
    # `pdb` overrides.
    # ----------------
    # `pdb` calls these functions at various points during the execution of a script, allowing us to inject our own
    # logic at breakpoints.
    # ==================================================================================================================

    def user_line(self, frame):
        """Called whenever a line of code is hit where program execution has stopped.

        Two behaviors, possibly both at once, are possible here. If there is a watch statement on the current line,
        then the `_ScriptExecutor` extracts the name of the variable being assigned and stores it internally. If the
        `_ScriptExecutor` has extracted a variable but has not evaluated it, then it evaluates it and sends it to the
        client.

        Args:
            frame (object): A `Pdb` object encapsulating the program's current execution state.
        """
        # check if the `_ScriptExecutor` is waiting to evaluate a variable
        if self._is_waiting_to_eval():
            # if the variable is defined in the current frame, evaluate it; otherwise, keep stepping until it is
            if self._can_eval(frame):
                self._handle_break(frame)
                self.do_continue(frame)
            else:
                self.do_step(frame)

        # check if there is a watch statement at the current line
        if self._get_file_lineno(frame) in self._watch_actions:
            try:
                # there is a watch statement, so try to extract a variable
                self._prepare_to_eval(frame)
                self.do_next(frame)
            except ValueError:
                # if no variable was found in the current line, continue
                self.do_continue(frame)

    def user_return(self, frame, return_value):
        """Called whenever a function returns where the program execution has stopped.

        A watch statement cannot be set on a return, so we only need to check if a variable needs to be evaluated
        and, if so, evaluate it.

        Args:
            frame (object): A `Pdb` object encapsulating the script's current execution state.
            return_value (object): The return value of the function.
        """
        # Some feature of Pytorch causes tensor operations to occur nested within many functions before the
        # frame
        # returns to its original position and the operation is finally evaluated. Thus, `user_return()` is
        # called
        # many times before the operation completes, so we must catch them all and step through them until
        # the final
        # one returns
        if not self._is_waiting_to_eval():
            # if there is no variable to evaluate, continue
            self.do_continue(frame)
        elif self._can_eval(frame):
            # if we have a variable to evaluate and can evaluate it, do so
            self._handle_break(frame)
            self.do_continue(frame)
        else:
            # step until we can evaluate the variable
            self.do_step(frame)

    # `message` and `error` are called by `Pdb` to write to the respective streams. We block those messages so that
    # only object info will be sent to stdout, and thus read by the engine.
    def message(self, msg):
        pass

    def error(self, msg):
        pass

    # These are overrides that were included in `atom-python-debugger`; TODO: investigate their purpose.
    def precmd(self, line):
        return line

    def postcmd(self, stop, line):
        return stop

    def _handle_break(self, frame):
        """Evaluates a watched variable, generates a symbol slice that contains it, and sends it to the client.

        Args:
            frame (pdb.Frame): The program state frame in which the variable should be evaluated.
        """
        obj, symbol_name, watch_id, actions = self._eval(frame)
        symbol_id = self._viz_engine.get_symbol_id(obj)
        self._prepare_and_send_message(symbol_id, symbol_name, symbol_id, False, watch_id, actions)

    # ==================================================================================================================
    # Static helper methods.
    # ----------------------
    # Functions which are used to transform incoming messages to a usable format.
    # ==================================================================================================================

    @staticmethod
    def _normalize_path(file_path):
        """Normalizes a file path so it can be safely looked up in `self._watch_actions`.

        Args:
            file_path: A string file path.

        Returns:
            (str): The normalized file path.
        """
        return normcase(normpath(file_path))


class PrintOverwriter:
    """
    An object to be used as a replacement for stdout, which uses a given function to "print" strings.
    """
    def __init__(self, send_message):
        self.send_message = send_message

    def write(self, text):
        if text == '\n':
            return
        self.send_message(None, None, False, -1, '{}\n'.format(text), None)

    def flush(self):
        pass


def _gen_send_message(send_queue):
    """Generates a function which relays information about the program to clients in a standardized format.

    Args:
        send_queue (multiprocessing.Queue): A queue to which all messages created by `_send_message()` are added.

    Returns:
        (func): A function which relays information about the program to the client.
    """
    def _send_message(symbol_slice, view_symbol_id, refresh, watch_id, text, error):
        """Writes a message to the client containing information about symbols and the program state.

        Args:
            symbol_slice (dict or None): A symbol table slice that the client should add to its local store, or `None`
                if no slice should be added.
            view_symbol_id (str or None): A symbol ID that the client should view upon receiving the message, or `None`
                if no symbol should be viewed.
            refresh (bool): Whether the client should reset its symbol table information before incorporating the new
                slice.
            watch_id (int): An integer unique to the watch statement whose information is being sent, or -1 if the
                message is not associated with a watch statement.
            text (str or None): A string printed by the user-specified script.
            error (str or None): The full text of an exception message that should be relayed to the client.
        """
        message = {
            'symbols': symbol_slice,
            'viewSymbol': view_symbol_id,
            'refresh': refresh,
            'watchId': watch_id,
            'text': text,
            'error': error,
        }
        send_queue.put(json.dumps(message))
    return _send_message


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

    TODO: update args format and content
    Args:
        receive_queue (Queue): A queue shared with the calling process to which requests for new symbol schemas are
            written by the parent.
        send_queue (Queue): A queue shared with the calling process to which this process writes symbol schema strings.
        script_path (str): The absolute path to a user-written script to be executed.
        watches (list): A list of watch expression objects of form {'file': str, 'lineno': str, 'action': dict}.
    """

    send_queue.put('wat')  # gotta send some junk once for some reason
    send_message = _gen_send_message(send_queue)

    # Replace stdout with an object that conveys all statements printed by the user script as messages
    sys.stdout = PrintOverwriter(send_message)

    executor = _ScriptExecutor(send_message)
    for watch in watches:
        executor.add_watch_expression(watch['id'], watch['file'], watch['lineno'], watch['actions'])
    try:
        executor.execute(script_path)
        while True:
            request = receive_queue.get(True)
            executor.fetch_symbol_data(request['symbol_id'], request['actions'])
    except:
        raw_error_msg = traceback.format_exc()
        result = re.search(r"^(Traceback.*?:\n)(.*File \"<string>\", line 1, in <module>\s)(.*)$", raw_error_msg, re.DOTALL)
        clean_error_msg = result.group(1) + result.group(3)
        send_message(None, None, False, -1, None, clean_error_msg)
