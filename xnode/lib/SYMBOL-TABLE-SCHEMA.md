# Schema Format
**This document described the schemas for the JSON passed between the `ExecutionEngine` and the `REPL`, for visualization
 purposes.**
 
 ## Symbol table slice
 
 The top-level format of a _symbol table slice_ sent between the `ExecutionEngine` (Python backend) and the 
 `REPL` (Javascript frontend) is a JSON object structured like:
 
```json
{
     "<ID>": {
         "type": "<TYPE>",
         "str": "<STR>",
         "name": "<NAME>" || null,
         "attributes": {} || null,
         "data": {} || null,
     }
}
```
- `"<ID>"`: Unique string identifier for a symbol, e.g. `"@id:123456"`. Maps to a symbol object.  
See "Symbol IDs" and "Symbol Objects" sections for more details.
- `"type"`: Maps to a data-type string `<TYPE>` drawn from the set `{"number", "string", "bool", "list", "tuple", 
"set", "dict", "class", "module", "object", "function", "tensor", "graphdata", "graphop", "graphcontainer"}`
- `"str"`: Maps to a display string `"<STR>"`, e.g. `"List[4]"`.
- `"name"`: Maps to a name string `"<NAME>"` (if the symbol has one), e.g. `"myCoolVariable"`; else, `null`.
- `"attributes"`: Maps to an attributes object containing details of Python attributes; or `null` if still unfilled. 
(The names of attributes are what a call to `dir(symbolName)` returns.)  See "Attribute Objects" section for more details.
- `"data"`: Maps to a data object containing information for visualization; or `null` if still unfilled. See "Data 
Objects" section for more details.

## Symbol IDs (TODO)
Symbol IDs (aka. `symbolID`s) are unique string identifiers for a symbol. Symbol IDs are used as keys in a symbol 
table that keeps track of the symbol objects that have been generated (backend) or received (frontend).
They are also used in the representation of symbols that reference/"hold-onto" other symbols (e.g. a symbol of type 
`"list"` "holds-onto" its elements, which could be `"number"`, `"string"`, or even other `"list"` symbols).

A symbol ID takes the following form: `"@id:" + <symbolId> + ":" + <symbolVersion>`

### Primitives vs. non-primitives (TODO)
```
If primitive (id(x) == id(y) iff eval(x) == eval(y); e.g. number, string, bool), direct representation.
If non-primitive (e.g. list, set, dict), indirect representation.
 // CONSTRAINT: Since storing numbers directly, any subclass of, say, `int` will not display instance fields when loaded
 // in-plae (outside of the namespace).
```
Are strings escaped if they look like a symbol ID?

## Symbol objects (TODO)
Symbol objects are not always sent all at once: `"attributes"` and `"data"` objects are initially left _unfilled_ 
(`null`) until symbol data is requested

Data objects and attributes objects are separated because a Python symbol might have an attribute with the same name 
as one of the keywords used to store visualization information, causing a collision.

### Symbol type-specific data objects
The only ways in which symbols of different types differ are in their `"str"` and `"data"` values, so only 
examples of those are shown.

#### none
```
"str": "None",
"data": {
    "contents": null,
}
```

#### bool
```
"str": "False",
"data": {
    "contents": false,
}
```

#### number
TODO: Deal with Python `complex` primitive.
```
"str": "3.14",
"data": {
    "contents": 3.14,
}
```

#### string
Note the redundancy. TODO: Can we remove it?
```
"str": "Hello world!",
"data": {
    "contents": "Hello world!",
}
```

#### list/tuple/set
```
"str": "list[5]",
"data": {
    "contents": [1, 3.14, false, "hi", "@id:12345"],
}
```

#### dict
```
"str": "dict[4]",
"data": {
    "contents": {
        "stringkey": "value",
        "@id:12345": [1, 2, 3],  // any non-string key, must have indirection
    }
}
```

#### class
```
"str": "class<MyAwesomeClass>",
"data": {
    "functions": {
        "name": "@id:12345",  // functions are symbols too
    },
    "staticfields": {
        "name": "@id:23456"
    }
}
```

#### module
```
"str": "module<torch.autograd>",
"data": {
    "contents": {
        "example_fn": "@id:12345",
    },
}
```

#### object
```
"str": "object<MyAwesomeClass>",
"data": {
    "contents": {
        "example_fn": "@id:12345",
    },
}
```

#### function
```
"str": "function<foo>",
"data": {
    "args":["hi", "hi"],
    "kwargs":{"kwarg1": "xnode$1234"},
    "filename": "hihi.py",
    "lineno": 2,
}
```

#### tensor
```
"str": "tensor[3,2,1].float32",
"data": {
    "contents": [[1,2,3],[2,3,4]],
    "size": [1,2,3],
    "type": "float32", // "float16", "float32", "float64", "uint8", "int8", "int16", "int32", "int64"
}
```

#### graphdata (TODO)
```
"str": "GraphData",
"data": {
    "creatorop": null, //reference to graphop symbol, or None if leaf,
    "creatorpos"
    "kvpairs": {
        // user-defined key-value pairs
    }
}
```

#### graphop (TODO)
```
"str": "GraphOp",
"data": {
    "function": "xnode$98750897202" // reference to function which performed the operation represented by graphop
    "args": [["arg1"], ["arg2", "xnode$02395897342"]] // list of arguments to the op, containing only None or references to graphdata
    "kwargs": {
        "dim": "xnode$3032099235" // keyword : graphdata ref pairs for each keyword argument input; assumed None for any keys not present
    },
    "container":"xnode$98750897202",
    "functionname": "funky_the_function",
    "outputs": ["xnode$23509321590"] // list of graphdata objects output by the op
}
```

#### graphcontainer (TODO)
```
"str": "GraphContainer",
"data": {
    "contents": ["xnode$98750", "xnode$97750"], // list of graphop.graphcontainer grouped by this container.
    "container": "xnode$3032099235",
    "temporalstep": 1,  // -1 for abstractive containers, >=0 for temporal
    "height": 5,
    "functionname": "funky_the_function",
}
```