import typing


Foo = typing.NewType('Foo', int)
Bar = typing.NewType('Bar', str)


def fn(x: Foo) -> Bar:
    return "hi"


def fn2(x: Bar) -> Foo:
    return 5

b = fn(10)
fn2('fiddle')
