# 代わりに[Seesaa Wiki Enhancer](https://github.com/reamkf/seesaawiki-enhancer?tab=readme-ov-file)を使用してください。
# Use [Seesaa Wiki Enhancer](https://github.com/reamkf/seesaawiki-enhancer?tab=readme-ov-file) instead.

# vscode-seesaawiki
Seesaa Wiki syntax support for Visual Studio Code

**This extension is unofficial.**

## Features
- Syntax highlight (some are not supported)
- Snippets and keyboard shortcuts for some syntaxes
- Outline view
- FoldingRange support for headings and `[+]~[END]` / `[-]~[END]`

## Installation
Download `.vsix` file from [releases](https://github.com/reamkf/vscode-seesaawiki/releases) and follow the instruction [here](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix).

## Usage
1. Install the extension
2. Create file with extension `.seesaawiki`
3. Copy & paste the source of your Seesaa Wiki page to the file

## Keyboard Shoutcuts
- `Ctrl+B` : Toggle bold (`''foo''`)
- `Ctrl+U` : Toggle underline (`%%%foo%%%`)
- `Ctrl+D` : Toggle deleted (`%%foo%%`)

## Release Notes
### v0.0.5 - 2023/10/11
Adjusted some snippet
Added '%' & '|' to surroundingPairs

### v0.0.4 - 2023/02/13
Fixed regex for some syntaxes

### v0.0.3 - 2023/02/13
Adjusted commands and keyboard shortcuts

### v0.0.2 - 2023/02/13
Initial release

## To-Do
- Support more syntaxes
- Image preview on mouse hover to image URLs
- Show color picker

<!-- ## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.


-->
