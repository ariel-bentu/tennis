
import React, { useState, useEffect } from 'react';

import { Spacer, Loading, VBox, Text } from './elem'

import * as api from './api'





export default function MyBill({ UserInfo, notify }) {
    const [balance, setBalance] = useState(undefined);
    const [noBalance, setNoBalance] = useState(undefined);


    useEffect(() => {
        if (UserInfo) {
            api.getUserBalance(UserInfo.email).then(
                b => {
                    if (b)
                        setBalance(b)
                    else
                        setNoBalance(true)
                },
                (err) => {
                    notify.error(err.message);
                    setNoBalance(true)
                })
        }
    }, [UserInfo])


    return (
        <div style={{ height: '65vh', width: '100%' }}>
            <Spacer height={20} />

            <Text>נתונים עדיין אינם נכונים!!!</Text>
            <VBox>
                {noBalance ?
                    "אין נתונים עבורך"
                    :
                    balance ?
                        <Text>{balance > 0 ? balance + ' ש״ח בזכות' :
                            balance == 0 ? "0 - אין חוב" :
                                -balance + ' ש״ח חוב'
                        }</Text> :
                        <Loading msg="טוען מאזן" />
                }
            </VBox>


        </div >
    );
}
