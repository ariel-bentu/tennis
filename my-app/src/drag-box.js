import { useDrag } from 'react-dnd';
import { ItemTypes, Spacer } from './elem';
const style = {
    display:'flex',
    flexDirection:'row',
    border: '1px dashed gray',
    backgroundColor: 'white',
    cursor: 'move',
    float: 'left',
    width: '9rem',
    fontSize: 12, 
    margin:2
};
export const Box = function Box({ user, height, onRemove, source, sourcePair, backgroundColor}) {
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
    return (<div ref={drag} style={{ ...style, height:height || style.height , opacity , backgroundColor:backgroundColor || 'transparent'}} >
            {onRemove?<span style={{ cursor: 'pointer', verticalAlign:'text-top' }} onClick={onRemove}>
              ×
            </span>:null}
            {onRemove?<Spacer width={15}/>:null}
			{
            user.displayName
            }
		</div>);
};
