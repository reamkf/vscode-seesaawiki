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
		let symbol : vscode.DocumentSymbol;
		const lastUnclosedHeadingSymbol : Array<vscode.DocumentSymbol | null> = [null, null, null];

		for(let lineNum = 0; lineNum < document.lineCount; lineNum++){
			const line = document.lineAt(lineNum);
			const headingMatch = line.text.match(/^\*{0,3}/);
			const headingLevel = headingMatch && headingMatch[0].length || 0;
			if(headingLevel){
				symbol = new vscode.DocumentSymbol(line.text, "Heading " + String(headingLevel), vscode.SymbolKind.String, line.range, line.range);

				// Close opened deeper headings
				for(let level = headingLevel; level <= 3; level++){
					if(lastUnclosedHeadingSymbol[level-1] !== null){
						lastUnclosedHeadingSymbol[level-1]!.range = new vscode.Range(lastUnclosedHeadingSymbol[level-1]?.range.start || new vscode.Position(lineNum-1, 0), new vscode.Position(lineNum-1, 0));
						lastUnclosedHeadingSymbol[level-1] = null;
					}
				}

				// append child or push to documentSymbols
				let childFlag = false;
				for(let j = headingLevel-1; j > 0; j--){
					if(lastUnclosedHeadingSymbol[j-1] !== null){
						lastUnclosedHeadingSymbol[j-1]!.children.push(symbol);
						childFlag = true;
						break;
					}
				}
				if(!childFlag){
					documentSymbols.push(symbol);
				}
				lastUnclosedHeadingSymbol[headingLevel-1] = symbol;
			}
		}
		const lastLine = document.lineAt(document.lineCount-1);
		for(const level of [1, 2, 3]){
			if(lastUnclosedHeadingSymbol[level-1] !== null){
				lastUnclosedHeadingSymbol[level-1]!.range = new vscode.Range(lastUnclosedHeadingSymbol[level-1]?.range.start || new vscode.Position(document.lineCount-1, 0), lastLine.range.start);
			}
		}

		return documentSymbols;
	}
}

class FoldingRangeProvider {
	provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken){
		const foldingRanges : vscode.FoldingRange[] = [];
		const headingStartLineNum : number[] = [-1, -1, -1];
		const foldingStartLineNum : number[] = [];
		const headingInFoldingStartLineNum : number[] = [-1, -1, -1];

		console.log("FoldingRange analysis start");
		const logRanges = (name: string) => console.log(
			"> " + name + ": " + (foldingRanges[foldingRanges.length-1].start+1) + "-" + (foldingRanges[foldingRanges.length-1].end+1)
		);
		for(let lineNum = 0; lineNum < document.lineCount; lineNum++){
			const line = document.lineAt(lineNum);
			const headingMatch = line.text.match(/^\*{0,3}/);
			const headingLevel = headingMatch && headingMatch[0].length || 0;
			if(headingLevel){
				// Close opened deeper headings
				for(let level = headingLevel; level <= 3; level++){
					if(headingStartLineNum[level-1] !== -1){
						foldingRanges.push(new vscode.FoldingRange(headingStartLineNum[level-1], lineNum-1));
						logRanges("Heading");
						headingStartLineNum[level-1] = -1;
						headingInFoldingStartLineNum[level-1] = -1;
					}
				}

				headingStartLineNum[headingLevel-1] = lineNum;
				if(foldingStartLineNum.length){
					headingInFoldingStartLineNum[headingLevel-1] = foldingStartLineNum[foldingStartLineNum.length-1];
				}
			} else if(line.text.match(/^\[(\+|\-)\]/)){
				foldingStartLineNum.push(lineNum);
			} else if(line.text.match(/^\[END\]/)){
				if(foldingStartLineNum.length){
					let start = foldingStartLineNum.pop();
					if(start !== undefined){
						foldingRanges.push(new vscode.FoldingRange(start, lineNum));
						logRanges("Folding");

						// Close headings in this folding
						for(let level = 1; level <= 3; level++){
							if(headingInFoldingStartLineNum[level-1] === start){
								foldingRanges.push(new vscode.FoldingRange(headingStartLineNum[level-1], lineNum-1));
								logRanges("Heading");
								headingStartLineNum[level-1] = -1;
								headingInFoldingStartLineNum[level-1] = -1;
							}
						}
					}
				}
			}
		}
		for(const level of [1, 2, 3]){
			if(headingStartLineNum[level-1] !== -1){
				foldingRanges.push(new vscode.FoldingRange(headingStartLineNum[level-1], document.lineCount-1));
				logRanges("Heading");
			}
		}
		while(foldingStartLineNum.length){
			let start = foldingStartLineNum.pop();
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