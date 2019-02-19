import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="xnode",
    version="0.0.1",
    author="Ryan Holmdahl and Nikhil Bhattasali",
    author_email="team@xnode.ai",
    description="A platform for program visualization.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/nikhilxb/xnode",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3.6",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
