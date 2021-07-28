import { observer } from "mobx-react";
import React from "react";
import 'draft-js/dist/Draft.css';
import { WidgetModel } from "models/WidgetModel";
import './WidgetEditor.module.css';
import appStyles from '../AppStyles.module.css';
import styles from './WidgetEditor.module.css';
import { Editor } from '@tinymce/tinymce-react';
import { ColorIndex, ColorValue } from "helpers/ColorTool";

@observer
export default class WidgetEditor 
extends React.Component<{context: WidgetModel},{editor: any}> 
{    

    // -------------------------------------------------------------------
    // render
    //      https://www.tiny.cloud/docs/plugins/opensource/
    //      https://www.tiny.cloud/docs/advanced/available-toolbar-buttons/
    //      
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const color = context.colorTheme.color;
        const editorColor= color(ColorIndex.Background, ColorValue.V6_Bright);

        const height = context.h * context.ref_App.page.rowHeight;


        const handleEditorChange = (event: any) => {
            console.log(`The html is: ${this.state.editor}`)
        }

        return (
            <div className={`${appStyles.Filler} ${styles.widgetEditor}`} id={this.props.context.i}>
            <Editor
                onInit={(evt, editor) => {
                    this.setState({editor}) 
                    editor.getBody().style.backgroundColor = editorColor;

                    editor.on('KeyUp', function(e){
                        var sel = editor.selection.getSel();
                        var caretPos = sel.anchorOffset;
                        var txtData = sel.anchorNode.textContent;
                        
                        console.log(txtData === "* ")
                        if(caretPos === 2 && (txtData === "* " || txtData === "- "))
                        {
                            if(sel.focusNode.parentElement.constructor.name === "HTMLParagraphElement")
                            {
                                console.log("CONVERT")
                            }
                        }
                        console.log(`(${sel.focusNode.parentElement.constructor.name} ${caretPos}) '${txtData}'`);
                        
                    });

                    // const menuItem = {
                    //     type: 'item',
                    //     text: "WOW",
                    //     shortcut: "Q",
                    //     onAction: ()=>{}    
                    // } as ContextMenuItem

                    // const menuApi = {
                    //     update: (element: Element) => "bold italic"
                    // }

                    //editor.ui.registry.addContextMenu("Foo", menuApi)
                }}
                initialValue={`<p>Add something here</p>${"<p/>".repeat(height/19)}`}
                apiKey="i9mbmtxj437lrd1i9a3vsf1e3cg88gbxmkzbcncacfwbj0l0"
                onChange={handleEditorChange}
                init={{
                height: height + 20,
                menubar: false,
                skin: 'small',
                icons: 'small',
                toolbar: false,//'bold italic color | outdent indent | bullist numlist | code',
                contextmenu: "bold italic link lists | code",
                toolbar_location: 'bottom',
                plugins: [
                    'advlist autolink lists link image charmap print preview anchor',
                    'searchreplace visualblocks code',
                    'insertdatetime media table paste code'
                ],
                content_css: './editor.css',
                }}
            />
            </div> 
        );
    };
}
