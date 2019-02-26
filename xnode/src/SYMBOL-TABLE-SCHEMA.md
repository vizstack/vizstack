# Schema Format
**This document described the schemas for the JSON passed between the `ExecutionEngine` and the `REPL`, for visualization
 purposes.**

## VizContents
A _viz contents_ object describes the properties of a single Viz -- either a Primitive or a Layout. VizContents can reference other VizSpecs by ID, creating a nested visualization. The format of VizContents depends on the Viz type:

### TokenPrimitive
A contiguous, inseparable block which might contain text.
```
{
    "text": str,
}
```
- `"text"` is the string that should be displayed in the token.

### SequenceLayout
Arranges a list of other Vizzes into a vertical or horizontal sequence.
```
{
    "orientation": "vertical" | "horizontal",
    "elements": [<VizId>, ...]
}
```
- `"orientation"` is the direction in which the elements should be laid out.
- `"elements"` is a list of VizIds which should be displayed sequentially.

## VizModel
A _viz model_ contains the information needed to render a particular visualization, and is a JSON object of the format
```
{
    "type": "TokenPrimitive" | "SequenceLayout" | ...,
    "contents": <VizContents>
}
```
- `"type"` is a string which dictates which visualization primitive or layout should be rendered.
- `"contents"` is a VizContents object which describes the properties of the visualization, with format determined by `"type"`.

## VizSpec
A _viz spec_ describes a particular object which is being visualized, including VizModels and metadata. It is a JSON object of the format:
```
{
    "filePath": str,
    "lineNumber": int,
    "summaryModel": <VizModel>,
    "compactModel": <VizModel> | null,
    "fullModel": <VizModel> | null
}
```
- `"filePath"` is the full path of the file in which the Python backend was instructed to visualize the object (via a call to `xn.view()`).
- `"lineNumber"` is the integer number of the line in `"filePath"` where the object was visualized (via `xn.view()`).
- `"summaryModel"` is the VizModel which captures a fixed-size representation of the visualized object; currently, it is always a `Token`. It cannot reference other VizSpecs.
- `"compactModel"` is the VizModel which captures a small glimpse of the visualized object, such as the first few elements of a sequence. It can reference other VizSpecs by their VizId. It is `null` if the model has not yet been requested by the frontend.
- `"fullModel"` is the VizModel which captures the visualized object in its entirety, It can reference other VizSpecs by their VizId. It is `null` if the model has not yet been requested by the frontend. If non-`null`, `"compactModel"` is also non-`null`.

## VizId
A _viz ID_ is a string which uniquely identifies a VizSpec. The frontend does not know anything about its format, only that it is a unique identifier.
The backend is aware that it is of the form `"@id:{OBJECT_ID}!{SNAPSHOT_ID}!"`, where `"OBJECT_ID"` uniquely identifies the object being visualized and
`"SNAPSHOT_ID"` uniquely identifies the call to `xn.view()` where it was visualized.

## VizTableSlice
A _viz table slice_ maps VizIds to VizSpecs. Any new VizSpecs sent by the backend to the frontend will be in the form of a VizSlice.

## VizTable
The _viz table_ maps VizIds to VizSpecs. It is maintained by the frontend, and is updated when new VizTableSlices are sent by the backend. Those VizSlices are inserted into the VizTable by the frontend.

## ExecutionEngineMessage
The `ExecutionEngine` (Python backend) communicates with the `REPL` (Javascript frontend) by sending _execution engine messages_.
Each message is a JSON object of the form:

```
{
    "viewedVizId": <VizId> || null,
    "vizTableSlice": <VizTableSlice> || null,
    "shouldRefresh": true || false
}
```
- `"viewedVizId"` is the VizId associated with a VizSpec that `REPL` should render in a new viewer, or `null` if no new viewer should be opened.
- `"vizTableSlice"` is a VizTableSlice that `REPL` should add to the frontend's VizTable, or `null` if no new VizSpecs should be added.
- `"shouldRefresh"` is a boolean that dictates whether `REPL` should clear the canvas upon receiving the message.
