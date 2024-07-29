import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';
import { db } from '$lib/database';

const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  export async function POST({ request }) {
    const { stage, data } = await request.json();
    try {
      let result;
      switch (stage) {
        case 0:
          result = await prisma.stage0.create({
            data: { SONumber: data.SONumber, currentStage: stage,clientName:data.clientName,SubTotal:data.SubTotal, Total:data.Total, SOCategory: data.SOCategory, PMName: data.projectManagerName, clientExpectedDate: new Date(data.clientExpectedDate).toISOString() }
          });
          break;
        case 1:
          // console.log("Line Items:", JSON.stringify(data.lineItems, null, 2));
          console.log("DC Boxes:", JSON.stringify(data.dcBoxes, null, 2));
          const existingLineItems = await prisma.lineItems.findFirst({
            where: { SONumber: data.lineItems[0].SONumber }
          });
  
          if (!existingLineItems) {
            // Create lineItems only if they don't exist
            await prisma.lineItems.createMany({
              data: data.lineItems.map(item => ({ 
                SONumber: item.SONumber, 
                ItemName: item.name, 
                Quantity: item.quantity, 
                Unit: item.unit, 
                Rate: item.rate, 
                Amount: item.item_total, 
                Status: item.status 
              }))
            });
          }
          await prisma.stage1.create({
            data: {
              SONumber: data.dcBoxes.SONumber,
              DCNumber: data.dcBoxes.customName,
              Status: data.dcBoxes.status,
              PODNo: data.dcBoxes.trackingNo,
              DispatchDate: new Date(data.dcBoxes.dispatchedDate).toISOString(), 
              EstdDeliveryDate: new Date(data.dcBoxes.deliveryDate).toISOString(),
              DCAmount: data.dcBoxes.dcAmount,
              Attachment: data.dcBoxes.attachment
            }})
          break;
          // console.log("Data received in case 1:");
    //     case 2:
    //       result = await prisma.stage2.create({
    //         data: { age: parseInt(data.age), occupation: data.occupation }
    //       });
    //       break;
        case 3:
          // console.log("Data received in case 3:");
          console.log(JSON.stringify(data, null, 2));
          if (data.Ticketid==''){
            result = await prisma.installation.create({
              data: { SONumber: data.SONumber,engName:data.engName,ScheduleDate:new Date(data.ScheduleDate).toISOString(),MobNo:data.MobNo,VendorName:data.VendorName,InstallationRem:data.Remark,InstReport:data.Report }
          });
          }else if(data.Ticketid){
            result = await prisma.service.create({
              data: { SONumber: data.SONumber,engName:data.engName,ScheduleDate:new Date(data.ScheduleDate).toISOString(),MobNo:data.MobNo,VendorName:data.VendorName,ServiceRem:data.Remark,ServiceReport:data.Report, Serticketid: data.Ticketid }
            });
          }
          if (data.ReturnPickupName){
            result = await prisma.stage4.create({
              data: { SONumber: data.SONumber,
                      Name:data.ReturnPickupName,
                      MobNo:data.ReturnPickupMobile, ProjMngRemark:data.ReturnPickupRemark }
            });
          }
          break;
        default:
          return json({ success: false, message: 'Invalid stage' }, { status: 400 });
      }
  
      return json({ success: true, data: result });
    } catch (error) {
      console.error('Error saving data:', error);
      return json({ success: false, message: 'Error saving data' }, { status: 500 });
    }
  }

function currentDate(): any {
  throw new Error('Function not implemented.');
}




export async function GET({ params }) {
  try {
    const { SONumber } = params;
    let result;

    switch (stage) {
      case '0':
        result = await prisma.stage0.findUnique({
          where: { SONumber: soNumber }
        });
        break;
      case '1':
        result = await prisma.stage1.findMany({
          where: { SONumber: soNumber }
        });
        const lineItems = await prisma.lineItems.findMany({
          where: { SONumber: soNumber }
        });
        result = { dcBoxes: result, lineItems };
        break;
      case '3':
        const installation = await prisma.installation.findUnique({
          where: { SONumber: soNumber }
        });
        const service = await prisma.service.findUnique({
          where: { SONumber: soNumber }
        });
        const returnPickup = await prisma.stage4.findUnique({
          where: { SONumber: soNumber }
        });
        result = { installation, service, returnPickup };
        break;
      default:
        return json({ success: false, message: 'Invalid stage' }, { status: 400 });
    }

    if (!result) {
      return json({ success: false, message: 'Data not found' }, { status: 404 });
    }

    return json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching data:', error);
    return json({ success: false, message: 'Error fetching data' }, { status: 500 });
  }
}