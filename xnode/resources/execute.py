import argparse
import pdb
import sys
import os
import schema


# Taken from atom-python-debugger
# TODO check compliance w/ python 2, since it might not use message()
# TODO in-place changes are really going to fuck things up
# TODO currently bp on first line always
# TODO sort out the refs table
class AtomPDB(pdb.Pdb):

    def __init__(self, **kwargs):
        pdb.Pdb.__init__(self, **kwargs)
        # Convert Python objects to viz schema format.
        self.viz_engine = schema.VisualizationEngine()
        # The name of a variable whose value should be evaluated and transmitted at the next breakpoint.
        self.var_to_eval = None
        # Mapping of symbol IDs to Python objects for every object referenced by yielded variables.
        self.refs = {}

    def user_return(self, frame, return_value):
        """
        Called whenever a function returns where the program execution has stopped.

        A breakpoint at a return should only have been set by `user_line()`, meaning the value of `self.var_to_eval`
        is non-None. Thus, a schema object should be created for it and printed to stdout.

        Args:
            frame:
            return_value:

        Returns:

        """
        self._finish_breakpoint(frame)

    def user_line(self, frame):
        """
        Called whenever a line is hit where program execution has stopped.

        If the breakpoint was specified as a watch statement, then the variable being assigned at the current line is
        extracted and assigned to `self.var_to_eval`. Execution is then set to stop at the next line, when that variable
        will have been assigned.

        If the breakpoint was set by a previous call to `user_line()`, then the schema object of `self.var_to_eval` is
        created and sent to stdout.

        Args:
            frame:

        Returns:

        """
        if self.var_to_eval is not None:
            self._finish_breakpoint(frame)
        else:
            try:
                self.var_to_eval = self._get_var_from_frame(frame)
                self.do_next(frame)
            except ValueError:
                self.var_to_eval = None
                self.do_continue(frame)

    def _finish_breakpoint(self, frame):
        """
        Creates a schema object for the variable name stored in `self.var_to_eval`.

        Args:
            frame:

        Returns:

        """
        print(self._get_schema_obj(self.var_to_eval, frame), file=self.stdout)
        self.var_to_eval = None
        self.do_continue(frame)

    def _get_var_from_frame(self, frame):
        """
        Gets the variable name assigned to at the line being executed in the given frame.

        Args:
            frame:

        Returns:

        """
        return self._get_var_from_line(self._get_line_from_frame(frame))

    def _get_schema_obj(self, var_name, frame):
        """
        Creates a schema object for the variable with given name as evaluated in the given frame.

        Args:
            var_name:
            frame:

        Returns:

        """
        obj = None
        if var_name in frame.f_locals:
            obj = frame.f_locals[var_name]
        elif var_name in frame.f_globals:
            obj = frame.f_globals[var_name]
        if obj:
            data_obj, new_refs = self.viz_engine.get_symbol_data(obj)
            self.refs.update(new_refs)
            return data_obj
        else:
            raise ValueError

    def _get_line_from_frame(self, frame):
        """
        Gets a string version of the line being executed at the given frame.

        Args:
            frame:

        Returns:

        """
        self.current_stack, self.current_stack_index = self.get_stack(frame, None)
        frame, lineno = self.current_stack[self.current_stack_index]
        # TODO don't use format_stack_entry, use a custom function instead to eliminate the split-join
        stack_entry = self.format_stack_entry((frame, lineno))
        return ':'.join(stack_entry.split('():')[1:]).strip()

    def _get_var_from_line(self, line):
        """
        Extracts the string name of a variable being assigned to in the given line, or raises a `ValueError` if there is
        no assignment.

        Args:
            line:

        Returns:

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

    # TODO add sigint stuff
    def do_continue(self, arg):
        self.set_continue()
        return 1

    # `message` and `error` are called to write to the respective streams. We block those messages so that only object
    # info will be sent to stdout, and thus read by the engine.
    def message(self, msg):
        pass

    def error(self, msg):
        pass

    # TODO what do these do?
    def precmd(self, line):
        return line

    def postcmd(self, stop, line):
        return stop


def read_args():
    parser = argparse.ArgumentParser(description='Read in watch statements.')
    parser.add_argument('--script', type=str, dest='script')
    parser.add_argument('breakpoints', metavar='N', type=str, nargs='+')
    args = parser.parse_args()
    return args.script, args.breakpoints


def main():
    script, breakpoints = read_args()

    db = AtomPDB()

    for bp in breakpoints:
        db.do_break(bp)

    sys.stdout = None  # suppress any internal print statements
    db._runscript(script)

if __name__ == '__main__':
    main()
