from setuptools import setup

with open("README.md", "r") as fh:
    long_description = fh.read()

setup(
    name='vizstack-py',
    version='0.1.1',
    license='MIT',
    packages=['vizstack'],
    zip_safe=False,
    author='Ryan Holmdahl & Nikhil Bhattasali',
    author_email='vizstack@gmail.com',
    install_requires=['cuid', 'mypy_extensions', 'typing_extensions'],
    description="Generate Vizstack visualizations of Python programs.",
    url='https://github.com/vizstack/vizstack',
    long_description=long_description,
    long_description_content_type='text/markdown',
)
