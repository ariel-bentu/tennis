import { useDrag } from 'react-dnd';
import { ItemTypes, Spacer } from './elem';
const style = {
    display: 'flex',
    flexDirection: 'row',
    border: '1px dashed gray',
    backgroundColor: 'white',
    cursor: 'move',
    float: 'left',
    width: '9rem',
    fontSize: 12,
    margin: 2
};
export const Box = function Box({ user, height, width, onRemove, source, sourcePair, backgroundColor }) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.BOX,
        item: { user },
        end: (item, monitor) => {
            const dropResult = monitor.getDropResult();
            if (item && dropResult) {
                if (sourcePair !== dropResult.sourcePair) {
                    dropResult.onDrop(item.user, source);
                }

            }
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
            handlerId: monitor.getHandlerId(),
        }),
    }), [user]);
    const opacity = isDragging ? 0.4 : 1;
    return (<div ref={drag} style={{ ...style, height: height || style.height,  width: width || style.width, opacity, backgroundColor: backgroundColor || 'transparent' }} >
        {onRemove ? <div style={{ display:'flex', width:'10%', cursor: 'pointer', verticalAlign: 'text-top' }} onClick={onRemove}>
            ×
        </div> : null}
        {onRemove ? <Spacer width={15} /> : null}
        <div style={{  display:'flex', width:onRemove?'70%':'70%',  verticalAlign: 'text-top' }}>
        {            user.displayName        }
        </div>
        {user.rank ? <div style={{ display:'flex', width:'23%', verticalAlign: 'text-bottom', backgroundColor: 'green' }}>
            {user.rank}
        </div> : null}
        {user._order ? <div style={{ display:'flex', width:'15%', verticalAlign: 'text-bottom', backgroundColor: 'white' }}>
            {user._order}
        </div> : null}
    </div>);
};
