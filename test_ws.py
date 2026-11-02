import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:9001/', subprotocols=['mqtt']) as ws:
            print('Connected to /')
    except Exception as e:
        print('Error on /:', e)
        
    try:
        async with websockets.connect('ws://localhost:9001/mqtt', subprotocols=['mqtt']) as ws:
            print('Connected to /mqtt')
    except Exception as e:
        print('Error on /mqtt:', e)

asyncio.run(test())
