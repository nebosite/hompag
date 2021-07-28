// import Draft, { ContentState, Editor, EditorState, RichUtils , KeyBindingUtil, CompositeDecorator} from "draft-js";
// import { observer } from "mobx-react";
// import React from "react";
// import 'draft-js/dist/Draft.css';
// import { WidgetModel } from "models/WidgetModel";
// import styles from './WidgetEditor.module.css';
// import './WidgetEditor.module.css';
// import appStyles from '../AppStyles.module.css';
// import { ColorIndex, ColorValue } from "helpers/ColorTool";

export interface Fooooo {}

// interface MakeLinkProps {
//     done: (linkText: string | null, linkTarget: string)=>void, 
//     context: WidgetModel ,
//     text?: string
// }
// @observer
// export class MakeLink 
// extends React.Component<MakeLinkProps,{text: string, link: string}> 
// {
//     // -------------------------------------------------------------------
//     // ctor
//     // -------------------------------------------------------------------
//     constructor(props: MakeLinkProps)
//     {
//         super(props);

//         this.state = {text: props.text ?? "", link: ""}

//         // auto-paste clipboard if there is a link there
//         setTimeout(async () => {
//             let clipContents = await navigator.clipboard.readText();
//             if(!clipContents || clipContents.toLowerCase().indexOf("http") === -1) {
//                 clipContents = null
//             }
//             else {
//                 const httpSpot = clipContents.toLowerCase().indexOf("http") ;
//                 clipContents = clipContents.substr(httpSpot);
//             }
//             if(clipContents) this.setState({link: clipContents})
//         },0)
//     }

//     // -------------------------------------------------------------------
//     // render
//     // -------------------------------------------------------------------
//     render()
//     {
//         const {context} = this.props;
//         if(!context || !context.colorTheme) throw Error("Bad Context on MakeLink")

//         const color = context.colorTheme.color;
        
//         const okClick = () => {
//             this.props.done(this.state.text, this.state.link);   
//         }

//         const cancelClick = () => {
//             this.props.done(null,null);
//         }

//         const dialogStyle = {
//             background: color(ColorIndex.Background, ColorValue.V6_Bright),
//             color: color(ColorIndex.Foreground, ColorValue.V2_Dark)}

//         const inputStyle = {
//             background: color(ColorIndex.Background, ColorValue.V7_ExtraBright),
//             color: color(ColorIndex.Foreground, ColorValue.V2_Dark),
//             width: "80%"}

//         const buttonStyle = {
//             background: color(ColorIndex.Special, ColorValue.V7_ExtraBright),
//             color: color(ColorIndex.Foreground, ColorValue.V2_Dark)}
                
//         return <div className={styles.we_makelinkDialog} style={dialogStyle}> 
//             <div style={{marginBottom:"3px"}}>
//                 Text:  
//                 <input style={inputStyle}
//                     value={this.state.text} 
//                     onChange={(e) => this.setState({text: e.target.value})}  />
//             </div>
//             <div style={{marginBottom:"5px"}}>
//                 Link:  
//                 <input style={inputStyle}
//                     value={this.state.link} 
//                     onChange={(e) => this.setState({link: e.target.value})}  />            
//             </div>
//             <div>
//                 {this.state.text.trim() !== "" && this.state.link.trim() !== ""
//                     ? <button onClick={okClick}  style={buttonStyle}>OK</button>
//                     : null 
//                 }
                
//                 <button onClick={cancelClick} style={buttonStyle}>Cancel</button>
//             </div>
//         </div>
//     }
// }

// const MyLink = (props: any) => {
//     const {url} = props.contentState.getEntity(props.entityKey).getData();
//     return  <a href={url}> {props.children} </a>
// };




// @observer
// export default class WidgetEditor 
// extends React.Component<{context: WidgetModel}> 
// {    
//     state:{editorState:EditorState, makingLink: boolean}
//     constructor(props:{context: WidgetModel}) {
//         super(props);
//         const plainText = 'Add some text here... \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n';
//         const content = ContentState.createFromText(plainText);
    
//         const findLinkEntities = (
//                 contentBlock: any, 
//                 callback: any, 
//                 contentState: any) => {
//             contentBlock.findEntityRanges((character:any) => {
//                 const entityKey = character.getEntity();
//                 return (
//                     entityKey !== null &&
//                     contentState.getEntity(entityKey).getType() === "LINK"
//                 );
//             }, callback);
//         };

//         const decorator = new CompositeDecorator([
//             {
//               strategy: findLinkEntities,
//               component: MyLink,
//             },
//         ]);

//         this.state = { 
//             editorState: EditorState.createWithContent(content, decorator),
//             makingLink: false,   
//         };
    
//         //this.onChange = editorState => this.setState({editorState});
//     }

//     addLink = (editorState: EditorState, text: string, link: string) => {
//         if (link) {
//             const contentState = editorState.getCurrentContent();
//             const contentStateWithEntity = contentState.createEntity(
//               'LINK',
//               'MUTABLE',
//               {url: link}
//             );
//             const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
//             const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity });
//             this.setState({
//               editorState: RichUtils.toggleLink(
//                 newEditorState,
//                 newEditorState.getSelection(),
//                 entityKey
//               )
//             }, () => {
//               //setTimeout(() => this.refs.editor.focus(), 0);
//             });
//         }
//     }

//     // -------------------------------------------------------------------
//     // render
//     //      https://draftjs.org/docs/quickstart-rich-styling/
//     //      
//     // -------------------------------------------------------------------
//     render() {
//         const onChange = (newState: EditorState) => {
//             this.setState({editorState:newState});
//         }

//         const handleKeyCommand= (command: string, editorState: EditorState) => {
//             console.log(`Key command: ${command}`)
//             const newState = RichUtils.handleKeyCommand(editorState, command);
        
//             if (newState) {
//                 this.setState({editorState: newState})
//                 return 'handled';
//             }

//             switch(command)
//             {
//                 case "make-link":  
//                     this.addLink(editorState, "WOW", "http://adobe.com")
//                     break;
//                 default: 
//                     console.log(`Not handled: ${command}` )
//                     return 'not-handled';
//             }

//           }

//         const handleKey = (e: React.KeyboardEvent<{}>) => {
//             //console.log(`Key was: ${e.key} ${e.type}`);


//             if (e.key === 'k'  && KeyBindingUtil.isCtrlKeyCommand(e)) {
//                 this.setState({makingLink: true})
//                 e.preventDefault();
//                 //return null;
//                 return 'make-link';
//             }


//             return Draft.getDefaultKeyBinding(e);
//         }

//         const handleMakeLink = (linkText: string | null, linkTarget: string) => {
//             this.setState({makingLink: false})
//             console.log(`Make the link with this text: ${linkText} pointing to ${linkTarget}`)
//             // https://stackoverflow.com/questions/62321505/how-to-add-link-in-draft-js-no-plugins
//             // https://medium.com/@siobhanpmahoney/building-a-rich-text-editor-with-react-and-draft-js-part-2-2-embedding-links-d71b57d187a7
//         }

//         // blockStyleFn={styleBlock}
//         // const styleBlock = (block: Draft.ContentBlock) => {
//         //     const blockType = block.getType();
//         //     switch(blockType) {
//         //         case "zzzz": return editorStyles.we_unstyled;
//         //     }
//         // }

//         return (
//             <div>
//                 {this.state.makingLink 
//                     ? <div className={`${styles.we_makelinkBackground} ${appStyles.Filler}`}>
//                         <MakeLink done={handleMakeLink} context={this.props.context} />
//                       </div>
//                     : null
//                 }
//                 <Editor 
//                     editorState={this.state.editorState} 
//                     onChange={onChange}
//                     handleKeyCommand={handleKeyCommand}
//                     keyBindingFn={handleKey}
//                     readOnly={false}
//                 />
//             </div> 
//         );
//     };
// }
