from setuptools import setup

setup(
    name='vizstack-py',
    packages=['vizstack'],
    zip_safe=False,
    install_requires=['cuid', 'mypy_extensions', 'typing_extensions']
)