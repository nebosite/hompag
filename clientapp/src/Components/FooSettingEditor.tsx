// App Navigation handled here
import React from "react";
import styles from '../AppStyles.module.css';
import { UrlSettings } from "./UrlSettings";
import {  FooParams } from "./FooSettings";
import { observer } from "mobx-react";

// -------------------------------------------------------------------
// 
// -------------------------------------------------------------------
@observer
export default class SearchEditor 
  extends React.Component<{urlquery?: UrlSettings, searchParameters?: FooParams}> 
{
    urlquery:UrlSettings;

    // -------------------------------------------------------------------
    // ctor
    // -------------------------------------------------------------------
    constructor(props: {urlquery?: UrlSettings, onUpdate: (newState: FooParams) => void, searchParameters?: FooParams})
    {
        super(props);

        this.urlquery = props.urlquery;
    }

    // -------------------------------------------------------------------
    // update the search URL, but wait a little bit so we don't do an
    // update on every single keystroke
    // -------------------------------------------------------------------
    updateSearchUrl = () => {
        this.props.searchParameters.updateSearch(this.urlquery);
    }
    
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {searchParameters} = this.props;
        const settings = searchParameters.current;


        const renderTextInput = (
            label: JSX.Element, 
            width: number, 
            value: string | number | undefined, 
            changeValue: (textValue: string) =>  void) =>
        {
            return (<div className={styles.inputItem}>
                <span>{label}: </span>
                <input  className={styles.inputBox} type="text"  style={{width: `${width}px`}} 
                    value={ value ?? "" }
                    onChange={(e) => { 
                        changeValue(e.target.value); 
                        this.updateSearchUrl();
                    }}  />                             
            </div>);
        }
    
        // const renderCheckbox = (label: JSX.Element, value: boolean | undefined, changeValue: (newValue: boolean) =>  void) =>
        // {
        //     return (<div className={styles.inputItem}>
        //         <input  className={styles.inputCheckbox} type="checkbox"  defaultChecked={value}
        //              onChange={(e) => { changeValue(e.target.checked); this.updateSearchUrl();} } />   
        //              {label}         
        //     </div>);
        // }

        // const safeNum = (text: string) => {
        //     let output = parseFloat(text);
        //     return isNaN(output) ? undefined : output;
        // }

        return (
            <div>
                <div className={styles.basicRow}>
                    {renderTextInput(<span>Example</span>, 120, settings.example, (v) => settings.example = v)}
                </div>
            </div>
        );
    };
}


//https://www.w3schools.com/css/css_tooltip.asp