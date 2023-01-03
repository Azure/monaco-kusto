/**
 * Run fixes for accessibility issues
 */
export function runAccessibilityFixers() {
    fixCommandPalleteHeight();
}

/**
 * Fixing command pallete completion list not showing with small height.
 * Fix is from here: https://github.com/microsoft/monaco-editor/issues/70
 */
function fixCommandPalleteHeight() {
    let module = require("vs/base/parts/quickinput/browser/quickInputList");
    module.QuickInputList.prototype.layout = function (maxHeight: number) {
        this.list.getHTMLElement().style.maxHeight = maxHeight < 200 ? "200px" : Math.floor(maxHeight) + "px";
        this.list.layout();
    }
}