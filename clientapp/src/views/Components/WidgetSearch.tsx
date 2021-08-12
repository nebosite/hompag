import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { registerType } from "models/hompagTypeHelper";
import { registerDataTypeForWidgetType, WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData, WidgetType } from "models/WidgetModel";
import React from "react";
import Combobox from "./ComboBox";
import Row from "./Row";
import appStyles from '../AppStyles.module.css';
import styles from '../AppStyles.module.css';


interface SearchConfig
{
    name: string
    createSubmitUrl: (searchText: string) => string
}

const searches:SearchConfig[] = [
    {   name: "Google", 
        createSubmitUrl: (searchText: string) => `https://www.google.com/search?hl=en&q=${searchText}`
    },
    {   name: "Amazon", 
        createSubmitUrl: (searchText: string) => `https://www.amazon.com/s?k=${searchText}`
    },
    {   name: "Thesaurus", 
        createSubmitUrl: (searchText: string) => `https://www.thesaurus.com/browse/${searchText}`
    },
    {   name: "Rhymes", 
        createSubmitUrl: (searchText: string) => `https://rhymezone.com/r/rhyme.cgi?Word=${searchText}&typeofrhyme=perfect`
    },
    {   name: "Adobe", 
        createSubmitUrl: (searchText: string) => `https://inside.corp.adobe.com/search.html#q=${searchText}&t=intranet`
    },
    

]

export class WidgetSearchData extends WidgetModelData
{
    @observable private _searchType: string = searches[0].name
    get searchType() {return this._searchType}
    set searchType(value:string) {
        if(value === this._searchType) return;
        this._searchType = value;
        this.save();
    }

    constructor() {
        super();
        makeObservable(this);
    }
}

registerDataTypeForWidgetType(WidgetType.Search, "WidgetSearchData");
registerType("WidgetSearchData", () => new WidgetSearchData())


@observer
export default class WidgetSearch
extends React.Component<{context: WidgetContainer}, {searchText: string, choosing: boolean}> 
{    
    state = {searchText: "", choosing: false} 
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const data = this.props.context.ref_widget.data as WidgetSearchData; 
        const searchConfig = searches.find(s => s.name === data.searchType)

        const pixelWidth = context.w * context.parentPage.columnWidth;

        const labelStyle = {
            fontSize: "10px",
            background: context.colorTheme.color(ColorIndex.Special,ColorValue.V7_ExtraBright),
            color: context.colorTheme.color(ColorIndex.Highlight,ColorValue.V2_Dark),
        }

        return (
            <Row style={{fontSize: '10px', padding:'5px', paddingLeft: '3px', paddingTop: "6px", paddingRight: '0px'}}> 
                
                
                <div style={{position: "relative"}}>
                    {this.state.searchText 
                        ? null
                        : <div 
                            className={appStyles.searchTypeIndicator}
                            onClick={()=>this.setState({choosing: true})}
                            >{searchConfig.name}</div>
                    }
                    {this.state.choosing
                        ? <div className={appStyles.searchTypePicker}>
                            <Combobox 
                                startOpened={true}
                                onBlur={()=>this.setState({choosing: false})}    
                                itemsSource={searches.map(s=>({value: s.name, label: <div style={labelStyle}>{s.name}</div>}))}
                                selectedItem={data.searchType}
                                onSelectValue={v=> {
                                    this.setState({choosing: false})
                                    data.searchType = v}} 
                                placeholder="Search Type"
                                width='70px'
                                styleOverride={labelStyle}
                                        
                            /></div>
                        : null
                    }                    
                    <input  type="text" 
                            className={styles.searchInput}
                            value={ this.state.searchText }
                            style={{width: `${pixelWidth - 22}px`}}
                            onClick={()=>this.setState({choosing: false})}
                            onKeyUp={e => {
                                if(e.key === "Enter"){
                                    window.location.href = searchConfig.createSubmitUrl(this.state.searchText)
                                }
                            }}
                            onChange={(e) =>  this.setState({searchText: e.target.value}) }  />      

                </div>
                           
            </Row>
            
        );
    }; 
}
