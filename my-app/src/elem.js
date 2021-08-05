import * as React from 'react';
import { CircularProgress } from '@material-ui/core';

export function Spacer(props) {
    return <div style={{width:props.width || 5, height: props.height || 5}} />
}
export function Header(props) {
    return <div style={{fontSize:25, padding:10}}>{props.children}</div>
}


export function Toolbar(props) {
    return <div style={{flex:1, flexDirection:'row', height: 30, alignItems:'flex-start'}}>{props.children}</div>
}



export function Text(props) {
    return <div style={{ textAlign:props.textAlign || 'right', fontSize:props.fontSize || 15, padding:10}}>{props.children}</div>
}

export function Loading(props) {
    return <div style={{
        dir:"rtl",
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        alignContent: 'center',
        justifyItems: 'center',
        //backgroundColor:'green'
      }}>
        <CircularProgress /><Text fontSize={35} textAlign={"center"}>{props.msg}</Text>
      </div>
}