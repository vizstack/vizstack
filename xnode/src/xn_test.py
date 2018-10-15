from importlib import reload
from typing import MutableSequence

import xn


def test_default_should_print(capsys) -> None:
    reload(xn)
    xn.view('Hello world!')
    assert capsys.readouterr().out.strip() == 'Hello world!'


def test_set_view_fn_to_lambda_should_use_lambda() -> None:
    reload(xn)
    viewed: MutableSequence[str] = []
    xn.set_view_fn(lambda x: viewed.append(x))
    xn.view('Hello world!')
    assert len(viewed) == 1 and viewed[0] == 'Hello world!'
