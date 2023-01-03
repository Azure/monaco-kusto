/**
 * Run fixes for accessibility issues
 */
export function runAccessibilityFixers() {
    fixCommandPalleteHeight();
}

function fixCommandPalleteHeight() {
    let module = require("vs/base/parts/quickinput/browser/quickInputList");
    module.QuickInputList.prototype.layout = function (maxHeight: number) {
        this.list.getHTMLElement().style.maxHeight = maxHeight < 200 ? "200px" : Math.floor(maxHeight) + "px";
        this.list.layout();
    }
}