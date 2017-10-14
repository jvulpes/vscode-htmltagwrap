// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

function getTabString(editor: vscode.TextEditor): string {
	let spacesUsed = <boolean>editor.options.insertSpaces;
	if (spacesUsed) {
		let numOfUsedSpaces = <number>editor.options.tabSize;
		return ' '.repeat(numOfUsedSpaces);
	}

	return '\t';
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate() {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	vscode.commands.registerCommand('extension.htmlTagWrap', () => {
		// The code you place here will be executed every time your command is executed

		var editor = vscode.window.activeTextEditor;
		if (editor != undefined) {
			
			let tag = vscode.workspace.getConfiguration().get<string>("htmltagwrap.tag");
			if (!tag) {
				tag = 'p'; 
			}
			
			var selection = editor.selection;
			var selectedText = editor.document.getText(selection);

			var firstIndex = 1;
			var lastIndex = selectedText.length;
			
			/*
			console.log('selection is: ' + selectedText);
			console.log('length is: ' + lastIndex);
			console.log('selection.start.character: ' + selection.start.character);
			console.log('selection.end.character: ' + selection.end.character);
			*/

			var selectionStart = selection.start;
			var selectionEnd = selection.end;

			if (selectionEnd.line > selectionStart.line) {

				// ================
				// Wrap it as a block
				// ================

				var lineAbove = selectionStart.line - 1;
				var lineBelow = selectionEnd.line + 1;

				let tabSizeSpace = getTabString(editor);
				var selectionStart_spaces = editor.document.lineAt(selectionStart.line).text.substring(0, selectionStart.character);

				editor.edit((editBuilder) => {
					// Modify last line of selection
					editBuilder.insert(new vscode.Position(selectionEnd.line, selectionEnd.character), '\n' + selectionStart_spaces + '</' + tag + '>');
					editBuilder.insert(new vscode.Position(selectionEnd.line, 0), tabSizeSpace);

					for (let lineNumber = selectionEnd.line - 1; lineNumber > selectionStart.line; lineNumber--) {
						editBuilder.insert(new vscode.Position(lineNumber, 0), tabSizeSpace);
					}

					// Modify first line of selection
					editBuilder.insert(new vscode.Position(selectionStart.line, selectionStart.character), '<' + tag + '>\n' + selectionStart_spaces + tabSizeSpace);
				}).then(() => {

					var bottomTagLine = lineBelow + 1;
					var firstTagSelectionSelection: vscode.Selection = new vscode.Selection(selectionStart.line, selectionStart.character + 1, selectionStart.line, selectionStart.character + 1 + tag.length);
					var lastTagSelectionSelection: vscode.Selection = new vscode.Selection(bottomTagLine, selectionStart.character + 2, bottomTagLine, selectionStart.character + 2 + tag.length);
					var tagSelections: vscode.Selection[] = [firstTagSelectionSelection, lastTagSelectionSelection];

					editor.selections = tagSelections;
				}, (err) => {
					console.log('Edit rejected!');
					console.error(err);
				});
			}
			else {
				// ================
				// Wrap it inline
				// ================

				let selectionCharacterOffset: number;
				editor.edit((editBuilder) => {
					// First, surround selection with empty tags to avoid a duplicate closing tag in newer VS Code releases:
					// `html.autoClosingTags` (a default setting) would normally autoclose the first tag if it has an element name inside
					let openingTags: string = '<' + '>';
					let closingTags: string = '</' + '>';
					editBuilder.insert(new vscode.Position(selectionEnd.line, selectionEnd.character), closingTags);
					editBuilder.insert(new vscode.Position(selectionEnd.line, selectionStart.character), openingTags);
					selectionCharacterOffset = openingTags.length;

				}, {
						undoStopBefore: true,
						undoStopAfter: false
					}
				).then(() => {
					// Insert tag element name
					editor.edit((editBuilder) => {
						editBuilder.insert(new vscode.Position(selectionEnd.line, selectionEnd.character + selectionCharacterOffset + 2), tag);
						editBuilder.insert(new vscode.Position(selectionEnd.line, selectionStart.character + selectionCharacterOffset - 1), tag);
						selectionCharacterOffset += tag.length;
					}, {
						undoStopBefore: false,
						undoStopAfter: true
						}
					);
				}, (err) => {
					console.log('Tag insertion rejected!');
					console.error(err);
				}).then(() => {
					// Create selections
					let firstTagSelectionSelection: vscode.Selection = new vscode.Selection(selectionStart.line, selectionStart.character + selectionCharacterOffset - 1 - tag.length, selectionStart.line, selectionStart.character + selectionCharacterOffset - 1);
					let lastTagSelectionSelection: vscode.Selection = new vscode.Selection(selectionEnd.line, selectionEnd.character + selectionCharacterOffset + 2, selectionEnd.line, selectionEnd.character + selectionCharacterOffset + 2 + tag.length);
					let tagSelections: vscode.Selection[] = [firstTagSelectionSelection, lastTagSelectionSelection];

					editor.selections = tagSelections;
				}, (err) => {
					console.log('Element name insertion rejected!');
					console.error(err);
				});
			}
		};
	});
}