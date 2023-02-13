import * as vscode from 'vscode';

function regExpEscape(str : string) : string {
	return str.replace(/[-\/\\^$*+?.()|\[\]{}]/g, '\\$&');
}

function toggleSelection(prefix: string, suffix : string){
	const editor = vscode.window.activeTextEditor;
	if(editor){
		const selection = editor.selection;
		if(!selection.isSingleLine){
			return;
		};

		const selectedText = editor.document.getText(new vscode.Range(selection.start, selection.end));

		const prefixEscaped = regExpEscape(prefix);
		const suffixEscaped = regExpEscape(suffix);
		if(selectedText.match(new RegExp("^" + prefixEscaped + ".*" + suffixEscaped + "$"))){
			const replacedText = selectedText.replace(new RegExp("^" + prefixEscaped + "|" + suffixEscaped + "$", "g"), "");
			editor.edit(edit => {
				edit.replace(selection, replacedText);
			});
		} else {
			editor.insertSnippet(new vscode.SnippetString(prefix + "${1:${TM_SELECTED_TEXT}}" + suffix + "$0"));
		}

	}
}

const docSel : vscode.DocumentSelector = { language: "seesaawiki", scheme: "file" };

class DocumentSymbolProvider {
	provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken){
		const documentSymbols : vscode.DocumentSymbol[] = [];
		let ds : vscode.DocumentSymbol;
		const heading : Array<vscode.DocumentSymbol | null> = [null, null, null];

		for(let i = 0; i < document.lineCount; i++){
			const line = document.lineAt(i);
			const headingMatch = line.text.match(/^\*{0,3}/);
			const headingLevel = headingMatch && headingMatch[0].length || 0;
			if(headingLevel){
				ds = new vscode.DocumentSymbol(line.text, "Heading " + String(headingLevel), vscode.SymbolKind.String, line.range, line.range);

				// Close opened deeper headings
				for(let j = headingLevel; j <= 3; j++){
					if(heading[j-1] !== null){
						heading[j-1]!.range = new vscode.Range(heading[j-1]?.range.start || new vscode.Position(i-1, 0), new vscode.Position(i-1, 0));
						heading[j-1] = null;
					}
				}

				// append child or push to documentSymbols
				let childFlag = false;
				for(let j = headingLevel-1; j > 0; j--){
					if(heading[j-1] !== null){
						heading[j-1]!.children.push(ds);
						childFlag = true;
						break;
					}
				}
				if(!childFlag){
					documentSymbols.push(ds);
				}
				heading[headingLevel-1] = ds;
			}
		}
		const lastLine = document.lineAt(document.lineCount-1);
		for(const level of [1, 2, 3]){
			if(heading[level-1] !== null){
				heading[level-1]!.range = new vscode.Range(heading[level-1]?.range.start || new vscode.Position(document.lineCount-1, 0), lastLine.range.start);
			}
		}

		return documentSymbols;
	}
}

class FoldingRangeProvider {
	provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken){
		const foldingRanges : vscode.FoldingRange[] = [];
		const headingStartLine : number[] = [-1, -1, -1];
		const foldingStartLine : number[] = [];
		const headingInFolding : number[] = [-1, -1, -1];

		console.log("FoldingRange analysis start");
		const logRanges = (name: string) => console.log("> " + name + ": " + (foldingRanges[foldingRanges.length-1].start+1) + "-" + (foldingRanges[foldingRanges.length-1].end+1));
		for(let i = 0; i < document.lineCount; i++){
			const line = document.lineAt(i);
			const headingMatch = line.text.match(/^\*{0,3}/);
			const headingLevel = headingMatch && headingMatch[0].length || 0;
			if(headingLevel){
				// Close opened deeper headings
				for(let j = headingLevel; j <= 3; j++){
					if(headingStartLine[j-1] !== -1){
						foldingRanges.push(new vscode.FoldingRange(headingStartLine[j-1], i-1));
						logRanges("Heading");
						headingStartLine[j-1] = -1;
						headingInFolding[j-1] = -1;
					}
				}

				headingStartLine[headingLevel-1] = i;
				if(foldingStartLine.length){
					headingInFolding[headingLevel-1] = foldingStartLine[foldingStartLine.length-1];
				}
			} else if(line.text.match(/^\[(\+|\-)\]/)){
				foldingStartLine.push(i);
			} else if(line.text.match(/^\[END\]/)){
				if(foldingStartLine.length){
					let start = foldingStartLine.pop();
					if(start !== undefined){
						foldingRanges.push(new vscode.FoldingRange(start, i));
						logRanges("Folding");

						// Close headings in this folding
						for(let j = 1; j <= 3; j++){
							if(headingInFolding[j-1] === start){
								foldingRanges.push(new vscode.FoldingRange(headingStartLine[j-1], i-1));
								logRanges("Heading");
								headingStartLine[j-1] = -1;
								headingInFolding[j-1] = -1;
							}
						}
					}
				}
			}
		}
		for(const level of [1, 2, 3]){
			if(headingStartLine[level-1] !== -1){
				foldingRanges.push(new vscode.FoldingRange(headingStartLine[level-1], document.lineCount-1));
				logRanges("Heading");
			}
		}
		while(foldingStartLine.length){
			let start = foldingStartLine.pop();
			if(start !== undefined){
				foldingRanges.push(new vscode.FoldingRange(start, document.lineCount-1));
				logRanges("Folding");
			}
		}

		return foldingRanges;
	}
}

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand(
		'vscode-seesaawiki.bold',
		() => toggleSelection("''", "''")
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'vscode-seesaawiki.underline',
		() => toggleSelection("%%%", "%%%")
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'vscode-seesaawiki.deleted',
		() => toggleSelection("%%", "%%")
	));

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
		docSel, new DocumentSymbolProvider()
	));

	context.subscriptions.push(vscode.languages.registerFoldingRangeProvider(
		docSel, new FoldingRangeProvider()
	));
}


export function deactivate() {}