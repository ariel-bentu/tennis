

import { Spacer, VBox, Text } from './elem'


export default function MyBill({  Balance }) {
    let balInt = 0;
    if (Balance) {
        balInt = Math.round(Balance);
    }
    return (
        <div style={{ height: '65vh', width: '100%' }}>
            <Spacer height={45} />


            <VBox>
                {!Balance ?
                    "אין נתונים עבורך"
                    :
                    <VBox>
                        <Text fontSize={35}>{balInt > 0 ? balInt + ' ש״ח בזכות' :
                            balInt === 0 ? "0 - אין חוב" :
                                -balInt + ' ש״ח בחובה'
                        }</Text>
                        <Spacer height={20} />
                        <a href="https://payboxapp.page.link/nUbbPFMPQMeBQ8YB9">לתשלום בפייבוקס</a>
                    </VBox>
                }
            </VBox>
        </div >
    );
}
