import xnode
from typing import List


def digits_to_number(digits: List[int]) -> int:
    return int("".join(str(d) for d in digits))


def largest_num(list: List[int]) -> int:
    return 0


if __name__ == "__main__":
    # Run tests
    xnode.view(digits_to_number([1, 2, 3, 0]))
    xnode.view(digits_to_number([0, 1, 2, 3]))
