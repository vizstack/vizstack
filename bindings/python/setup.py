from setuptools import setup

setup(
    name='vizstack-py',
    version='0.1.0',
    license='MIT',
    packages=['vizstack'],
    zip_safe=False,
    author='Ryan Holmdahl & Nikhil Bhattasali',
    install_requires=['cuid', 'mypy_extensions', 'typing_extensions'],
    description="Generate Vizstack visualizations of Python programs.",
    url='https://github.com/vizstack/vizstack',
)
