from typing import Union, Dict, List

JsonType = Union[str, float, int, bool, None, List['JsonType'], Dict[str, 'JsonType']]
