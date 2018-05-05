# Library Structure
**This document provides an overview of how the main Xnode source library is structured.**

![Alt text](https://g.gravizo.com/source/diagram_1?https%3A%2F%2Fraw.githubusercontent.com%2Fnikhilxb%2Fxnode%2Flibrary-structure-docs%2Fxnode%2Flib%2FLIBRARY-STRUCTURE.md)
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

<!-- This is the original graph
digraph G {
    size ="4,4";
    main [shape=box];
    main -> parse [weight=8];
    parse -> execute;
    main -> init [style=dotted];
    main -> cleanup;
    execute -> { make_string; printf}
    init -> make_string;
    edge [color=red];
    main -> printf [style=bold,label="100 times"];
    make_string [label="make a string"];
    node [shape=box,style=filled,color=".7 .3 1.0"];
    execute -> compare;
}
-->
<!-- After using urlencode and adding it to 'https://g.gravizo.com/svg?' -->
<!-- Remember the closing parentheses -->
![Alt text](https://g.gravizo.com/svg?digraph%20G%20%7B%0A%20%20%20%20size%20%3D%224%2C4%22%3B%0A%20%20%20%20main%20%5Bshape%3Dbox%5D%3B%0A%20%20%20%20main%20-%3E%20parse%20%5Bweight%3D8%5D%3B%0A%20%20%20%20parse%20-%3E%20execute%3B%0A%20%20%20%20main%20-%3E%20init%20%5Bstyle%3Ddotted%5D%3B%0A%20%20%20%20main%20-%3E%20cleanup%3B%0A%20%20%20%20execute%20-%3E%20%7B%20make_string%3B%20printf%7D%0A%20%20%20%20init%20-%3E%20make_string%3B%0A%20%20%20%20edge%20%5Bcolor%3Dred%5D%3B%0A%20%20%20%20main%20-%3E%20printf%20%5Bstyle%3Dbold%2Clabel%3D%22100%20times%22%5D%3B%0A%20%20%20%20make_string%20%5Blabel%3D%22make%20a%20string%22%5D%3B%0A%20%20%20%20node%20%5Bshape%3Dbox%2Cstyle%3Dfilled%2Ccolor%3D%22.7%20.3%201.0%22%5D%3B%0A%20%20%20%20execute%20-%3E%20compare%3B%0A%20%20%7D)