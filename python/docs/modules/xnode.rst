``xnode`` module
================

.. automodule:: xnode

   .. function:: view(*objects: Any[, expansion_mode: Optional[str]=None])
      
	  When using the Xnode plugin, renders an interactive visualization of 
	  each object in ``objects``. If the plugin is not active, prints the 
	  objects instead.
	  
	  :param objects: The object(s) to be visualized.
	  :param expansion_mode: An optional expansion mode to be used for the objects. Should be one of 'full', 'compact', or 'summary' if present.
	  