import { PageModel } from "models/PageModel";
import React from "react";
import styles from '../AppStyles.module.css';

export default class ColorPalette extends React.Component<{pageModel: PageModel}> 
{    
  // -------------------------------------------------------------------
  // render
  // -------------------------------------------------------------------
  render() {
    const { pageModel} = this.props;

    const colorPicks = [0,1,2,3,4]
    const colorValues = [0,1,2,3,4,5,6,7,8]
    const ct = pageModel.colorTheme;
    
    return (
        <div>
            {colorValues.map(cv => 
                (<div key={cv} className={styles.divRow}>
                    {colorPicks.map(cp => <div key={cp} style={{width:"30px",height:"10px",background: ct.color(cp,cv)}}></div>)}
                </div>
            ))}
        </div> 
    );
  };
}
