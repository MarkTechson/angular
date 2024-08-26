/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {inject, Injectable} from '@angular/core';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {NodeRuntimeSandbox} from '../../node-runtime-sandbox.service';
import {CodeMirrorEditor} from '../code-mirror-editor.service';

@Injectable({
  providedIn: 'root',
})
export class CodeGeneratorService {
  systemInstruction = `You are an expert Angular developer writing production code. You use modern features from the latest version of Angular.
  When I describe a component of a website I want to build, please return the TypeScript, HTML and CSS needed to do so. 
  Do not give an explanation for this code. 
  Generate using Angular. Only return the code. Do not include usage information. Do not include any file names.
  
  Here are some important rules:
  1. if a component template uses ngFor, ngIf, ngSwitch or any other built in structural directive, 
     then the component should add a file level import for CommonModule as well as adding the 
     CommonModule class to the imports array of the @Component decorator. 
  
  
  2. If the template uses ngModel or related properties, the component should import 
     FormsModule and add the FormsModule class to the imports array of the @Component decorator.
  
  3. If it appears in the imports property of the decorator, make sure it is in the fileImports.

  4. Add the "standalone: true"  property to every @Component decorator.

  Generate the component in the following format:
The output will be a json structure that maps to the following schema:

  [
    {
      "name": "my-component.component.ts",
      "className": "MyComponent",
      "selector":  "app-my-component",
      "type": "Component",
      "code": "component code",
    }, 
    {
      "name": "my-component.component.html",
      "code": "component html",
    },
    {
      "name": "my-component.component.css",
      "code": "component styles",
    }
  ]
  `;
  private readonly nodeRuntimeSandbox = inject(NodeRuntimeSandbox);
  private readonly codeMirror = inject(CodeMirrorEditor);

  async generatateCode(
    apiKey: string,
    model: string,
    prompt: string,
    useBrowserModel: boolean,
  ): Promise<GeneratedFile[]> {
    if (useBrowserModel) {
      return [];
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const selectedModel = genAI.getGenerativeModel({
        model,
        systemInstruction: this.systemInstruction,
      });
      selectedModel.generationConfig.responseMimeType = 'application/json';

      const result = await selectedModel.generateContent(prompt);
      const response = result.response;
      const filesObject = JSON.parse(response.text()) as GeneratedFile[];

      const code = await this.updatePrimaryComponent(filesObject);
      const mainFile: GeneratedFile = {
        name: 'src/main.ts',
        code,
      };

      return [...filesObject, mainFile];
    }
  }

  private async updatePrimaryComponent(filesObject: GeneratedFile[]): Promise<string> {
    const fileContents = await this.nodeRuntimeSandbox.readFile('src/main.ts');
    const decoratorTag = '@Component({';
    let componentName = 'UnknownComponent';
    let selectorName = 'app-unknown';
    let importPath = 'unknown.component.ts';
    let code = `${fileContents}`;

    // find the component
    for (let i = 0; i < filesObject.length; i++) {
      const generatedFile = filesObject[i];

      if (generatedFile && generatedFile.type === 'Component') {
        let selector = 'app-unknown-component';

        const match = generatedFile.code.match(/selector:.*'(.*?)'/);
        if (match) {
          selector = match[1];
        }

        componentName = generatedFile.className ?? 'UnknkownComponent';
        selectorName = selector;
        importPath = `import { ${componentName} } from '${generatedFile.name.slice(0, -3)}';`;
        break;
      }
    }

    // add typescript imports to the list
    code = code.replace(decoratorTag, `${importPath}\n\n${decoratorTag}`);

    // add array imports
    const startPos = code.search(/imports *:.*\[/);

    if (startPos < 0) {
      code = code.replace(decoratorTag, `${decoratorTag}\n  imports: [${componentName}],`);
    } else {
      for (let i = startPos; i < code.length; i++) {
        if (code[i] === '[') {
          const [pre, post] = this.splitAtIndex(i + 1, code);
          code = `${pre}${componentName},${post}`;
          break;
        }
      }
    }

    // add the selector reference
    const templateStartPos = code.search(/template *:.*`/);
    for (let i = templateStartPos; i < code.length; i++) {
      if (code[i] === '`' || code[i] === "'" || code[i] === '"') {
        const [pre, post] = this.splitAtIndex(i + 1, code);
        code = `${pre}<${selectorName} />${post}`;
        break;
      }
    }

    return code;
  }

  private splitAtIndex(idx: number, str: string) {
    return [str.slice(0, idx), str.slice(idx)];
  }
}

export interface GeneratedFile {
  name: string;
  code: string;
  className?: string;
  type?: string;
  selector?: string;
}
