# Symbol request actions
**This document describes the schemas for the JSON passed from the `REPL` to the `ExecutionEngine` that specify special 
actions the engine should perform before sending symbol table slices.**
 
## Symbol request
A _symbol request_ is any interaction between `REPL` and `ExecutionEngine` where `REPL` asks the `ExecutionEngine` for 
information about a symbol, which we call the _primary symbol_. There are currently two types of symbol request:
 - _Watch statement_: the user requests the filled symbol object of the primary symbol as evaluated at a particular line
  in the program. When the program reaches that line, it generates a symbol table slice containing at least the filled 
  symbol object and the shells of any symbols referenced therein, as evaluated at that point in the program.
 - _Symbol fetch_: the user requests the symbol object of the primary symbol after the program has terminated. A symbol 
 table slice is immediately generated containing at least that symbol object and the shells of any symbols referenced
 therein, as evaluated at the end of the program.
 
## Symbol request action
In cases where a user requires more information than a symbol request returns by default, they may augment their request
with _symbol request actions_. A symbol request action changes the behavior of the `ExecutionEngine` when completing the
associated request. The existing symbol request actions are:
 - _Recurse_: include the filled symbol objects for all symbols referenced at a particular key in the primary symbol's 
 object. This procedure is then repeated for the newly added symbol objects, proceeding recursively until no new symbol 
 objects are added.

### Symbol request action schema
Symbol request actions are sent by `REPL` to the `ExecutionEngine` as JSON strings, in the format:
```json
{
  "recurse": [["<KEY1>"], ["<KEY2>", "<KEY3>"]]
}
```
 - `"recurse"`: maps to a list of lists. Each sublist represents a path that should be followed when looking for symbols
 to add to the slice. In the above example, any symbol referenced at `['data'][<KEY1>]` will be added, as well as any 
 symbol referenced at `['data'][<KEY2>][<KEY3>]`. Note that failure to find a key or follow a path will not raise an 
 error.