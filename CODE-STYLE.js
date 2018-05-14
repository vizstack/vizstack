/**
 * Short description of file/module.
 *
 * This module lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis semper velit ante, et aliquet leo aliquet non.
 * nec sem magna. Phasellus hendrerit neque dui, at lobortis ipsum fermentum non. Aenean egestas velit felis, vel
 * interdum neque volutpat at. Nulla facilisi. Pellentesque porttitor, erat id congue sollicitudin, arcu nulla porttitor
 * eros, vel porta velit purus a magna. Class aptent taciti sociosqu ad litora torquent per conubia stra,  per inceptos
 * himenaeos. Nam pretium ipsum ex, ac aliquet lectus ultrices a.
 *
 * The following is an example of writing things `in code`, which is displayed with monospace font.
 *
 * Notes:
 *     Cras sit amet velit justo. Nam feugiat neque erat, quis sodales tortor tincidunt ac. Curabitur ultricies vitae elit
 *     imperdiet suscipit. Etiam non venenatis nisl, nec hendrerit tellus. Nullam eget lacus pulvinar risus commodo
 *     volutpat. Aenean in tempus sem. Vestibulum dolor quam, egestas vel sodales vel, tincidunt sed ante. Morbi lobortis
 *     neque sapien, dapibus efficitur odio consectetur eget. Praesent a ex ligula. Aliquam erat volutpat. Curabitur eros
 *     ipsum, tincidunt malesuada porta vitae, placerat congue velit.
 */

// =====================================================================================================================
// Section summary for block of code
// ---------------------------------
// Add optional notes here. A block should be used to group a set of related functions or variables. The relative
// ordering of blocks are important -- make sure that the entire code file is logically organized. Imagine a user is
// completely new to this codebase and is trying to understand what is going on.
// =====================================================================================================================

// Subsection description
// ----------------------

// Stars are used for interface comments. (Compressed = no leading/trailing newlines).
// Slashes are used for implementation comments.

/** Short description of variable */
let variable1 = 0;

/** Short description of constant */
const CONSTANT1 = 0;

/** Short description of variable/constant with multiple sentences. Notice that we always use compressed interface-style
 *  formatting for variables/constants. */
let variable2 = "hello";

/** Variables/constants that are grouped should be PREFIXED with the group name, not suffixed. For example, rather than
 * "apple_color"/"banana_color"/"carrot_color" use "color_apple"/"color_banana"/"color_carrot". This homogeneity
 * makes it more apparent that the names are grouped. */
let group1_variant1 = "a";
let group1_variant2 = "b";
let group1_variant3 = "c";

/**
 * Short description of function.
 *
 * Longer description of function. Class aptent taciti sociosqu ad litora torquent per conubia stra, per inceptos
 * himenaeos. Nam pretium ipsum ex, ac aliquet lectus ultrices a.
 *
 * @param {number/boolean/string/object/function} arg1
 *     Description of argument 1. Lowercase built-in Javascript types.
 * @param {CustomClassName} arg2
 *     Description of argument 2. Uppercase custom class types.
 * @return {number/...}
 *     Description of return 1.
 */
 function func1(arg1, arg2) {
     // Implementation comments complement the code by explaining what is going on at either a higher or lower level as
     // the code; comments at the same level are redundant. Higher-level implementation comments explain the aim
     // of a piece of code, particularly if it contains complex logic. Lower-level implementation comments provide
     // detail that is not reflected in the code, e.g. the units of a variable or definitions of terms.
     return 0;
 }

 /**
  * Short description of function. Notice that we always use expanded interface-style formatting for functions.
  */
 function func2() {
     // TODO: Notice the colon before the description.
     return false;
 }