import pytest
import xnode
import sys


# TODO: update to new xnode.view package
# TODO: collect outputs within tests

class TestOutcome:
    def __init__(self, file_path, line_number, test_name, passed, error_text, views):
        self._file_path = file_path
        self._line_number = line_number
        self._test_name = test_name
        self._passed = passed
        self._error_text = error_text
        self._views = views

    def __view__(self):
        contents = [
            xnode.Sequence([
                xnode.Text('{}({}): {}'.format(self._file_path, self._line_number, self._test_name)),
                xnode.Text('PASSED' if self._passed else 'FAILED', color=xnode.Color.PRIMARY if self._passed else xnode.Color.ERROR),
            ]),
        ]
        if not self._passed:
            contents.append(xnode.Text(self._error_text, variant='token', color=xnode.Color.ERROR))
        if len(self._views) > 0:
            contents.append(xnode.Text('Captured outputs:'))
            contents += self._views
        return xnode.Sequence(contents, orientation='vertical',
                                  summary='{} {}'.format('.' if self._passed else 'F', self._test_name))


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when == 'call':
        xnode.set_show_fn(_SHOW_FN)
        xnode.show(TestOutcome(report.location[0], report.location[1], report.location[2], not report.failed, report.longreprtext, _VIEWS))
        _VIEWS.clear()


@pytest.hookimpl
def pytest_sessionstart(session):
    pass
    # print('Pytest session starting.')


_VIEWS = []
_SHOW_FN = None


@pytest.hookimpl
def pytest_runtest_logstart(nodeid, location):
    global _SHOW_FN
    if _SHOW_FN is None:
        _SHOW_FN = xnode._SHOW_FN
    xnode.set_show_fn(lambda x: _VIEWS.append(x))


@pytest.hookimpl
def pytest_runtest_logfinish(nodeid, location):
    # Suppress any other outputs
    xnode.set_show_fn(lambda x: None)


def main():
    target_script = sys.argv[1]
    show_fn = xnode._SHOW_FN
    pytest.main([target_script, '-p', 'xnpt', '-q', '--tb=no'])
    xnode.set_show_fn(show_fn)


if __name__ == '__main__':
    main()
