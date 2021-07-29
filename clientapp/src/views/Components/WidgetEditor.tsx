import { observer } from "mobx-react";
import React from "react";
import 'draft-js/dist/Draft.css';
import { registerDataTypeForWidgetType, WidgetModel, WidgetType } from "models/WidgetModel";
import './WidgetEditor.module.css';
import appStyles from '../AppStyles.module.css';
import styles from './WidgetEditor.module.css';
import { Editor } from '@tinymce/tinymce-react';
import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { registerType } from "models/hompagTypeHelper";

export class WidgetEditorData
{
    _body: string;
    get body() {return this._body}
    set body(value: string) {this._body = value; this.ref_parent.saveData()}

    private ref_parent: WidgetModel
}

registerDataTypeForWidgetType(WidgetType.Editor, "WidgetEditorData");
registerType("WidgetEditorData", () => new WidgetEditorData())

@observer
export default class WidgetEditor 
extends React.Component<{context: WidgetModel},{editor: any}> 
{    
    resizeOberver: ResizeObserver


    // -------------------------------------------------------------------
    // componentDidMount - set up resize listener
    // -------------------------------------------------------------------
    componentDidMount() {
        const {context} = this.props;

        const containerDiv = window.document.getElementById(`container_${context.i}`)
        // const potentialEditors = containerDiv.getElementsByClassName('tox-tinymce') 
        // console.log(`Found ${potentialEditors.length}`)
        // if(potentialEditors.length === 0) return; 
        const editorElement = containerDiv.lastChild as HTMLElement;
        //const editorElement = window.document.getElementById(`editor_${context.i}`)
        this.resizeOberver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if(entry.contentRect) {
                    const w = entry.contentRect.width;
                    const h = entry.contentRect.height
                    console.log(`ZZ: Rect: ${w},${h}`)
                    //editorElement.style.width = '';
                    editorElement.style.height = `${h + 18}px`;
                } 
                
                // Browser compat?  Not sure what to do if there is no rect.  The code below doesn't
                // work because we only get one contentBoxSize item
                // else {
                //     const w = entry.contentBoxSize[0];
                //     const h = entry.contentBoxSize[1].inlineSize
                //     console.log(`ZZ: Box: ${w},${h}`)
                //     enditorElement.style.width = w.toString();
                //     enditorElement.style.height = h.toString();
                // }
            }
        })
        this.resizeOberver.observe(containerDiv); 
    }

    // -------------------------------------------------------------------
    // render
    //      https://www.tiny.cloud/docs/plugins/opensource/
    //      https://www.tiny.cloud/docs/advanced/available-toolbar-buttons/
    //      
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const data = context.ref_data as WidgetEditorData
        const color = context.colorTheme.color;
        const editorColor= color(ColorIndex.Background, ColorValue.V6_Bright);

        const height = context.h * context.ref_App.page.rowHeight;


        const handleEditorChange = (event: any) => {
            context.ref_data.body = this.state.editor.contentDocument.body.innerHTML
            // console.log(`The htm}l is: ${context.ref_data.body}`)
        }

        

        return (
            <div className={`${appStyles.Filler} ${styles.widgetEditor}`} id={`container_${context.i}`}>
                <Editor
                    onInit={(evt, editor) => {
                        this.setState({editor}) 
                        editor.getBody().style.backgroundColor = editorColor;

                        editor.on('KeyUp', function(e){
                            var sel = editor.selection.getSel();
                            var caretPos = sel.anchorOffset;
                            var txtData = sel.anchorNode.textContent;
                            
                            // if the user types '* ' or '- ' then convert to a bullet
                            // Note that the character from &nbsp; is different that an ascii space.  That's
                            // why the match has two spaces in the 2nd character place.  They are actually 
                            // different character codes. 
                            if(e.key === ' ' && caretPos === 2 && (txtData.match(/^[*-][  ]/)))
                            {
                                if(sel.focusNode.parentElement.constructor.name === "HTMLParagraphElement")
                                {
                                    sel.focusNode.parentElement.outerHTML = `<ul><li>${txtData.substr(2)}</li></ul>`
                                }
                            }                        
                        });
                    }}
                    initialValue={data?.body ?? `<p>A shiny new text area</p>`}
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
