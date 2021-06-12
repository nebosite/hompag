import Draft, { ContentState, Editor, EditorState } from "draft-js";
import { observer } from "mobx-react";
import { Widget } from "models/PageModel";
import React from "react";
import editorStyles from './WidgetEditor.module.css';
import 'draft-js/dist/Draft.css';


@observer
export default class WidgetEditor 
extends React.Component<{context: Widget}> 
{    
    state:{editorState:EditorState}
    constructor(props:{context: Widget}) {
        super(props);
        const plainText = 'Add some text here... \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n';
        const content = ContentState.createFromText(plainText);
    
        this.state = { editorState: EditorState.createWithContent(content)};
    
        //this.onChange = editorState => this.setState({editorState});
      }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const onChange = (newState: EditorState) => {
            this.setState({editorState:newState});
        }

        const handleKey = (e: any) => {
            switch(e.key)
            {
                default: return Draft.getDefaultKeyBinding(e)
            }
        }

        const styleBlock = (block: Draft.ContentBlock) => {
            const blockType = block.getType();
            switch(blockType) {
                case "zzzz": return editorStyles.we_unstyled;
            }
        }

        return (
            <div>
                <Editor 
                    editorState={this.state.editorState} 
                    onChange={onChange}
                    keyBindingFn={handleKey}
                    blockStyleFn={styleBlock}
                    readOnly={false}
                />
            </div> 
        );
    };
}