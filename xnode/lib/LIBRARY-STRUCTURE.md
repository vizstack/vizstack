# Library Structure
**This document provides an overview of how the main Xnode source library is structured.**

![Alt text](https://g.gravizo.com/source/diagram_1?https%3A%2F%2Fgithub.com%2Fnikhilxb%2Fxnode%2Fblob%2Finteractive-python-shell%2Fxnode%2Flib%2FLIBRARY-STRUCTURE.md)
<details> 
<summary></summary>
diagram_1
  digraph G {
    size ="4,4";
    main [shape=box];
    main -> parse [weight=8];
    parse -> execute;
    main -> init [style=dotted];
    main -> cleanup;
    execute -> { make_string; printf};
    init -> make_string;
    edge [color=red];
    main -> printf [style=bold,label="100 times"];
    make_string [label="make a string"];
    node [shape=box,style=filled,color=".7 .3 1.0"];
    execute -> compare;
  }
diagram_1
</details>