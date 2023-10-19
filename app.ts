import * as moment from 'moment';
import * as fs from 'fs'

const LONGER_CALL_COST_PER_MINUTE = 150; // in cents more than 5 mins
const SHORTER_CALL_COST_PER_SECOND = 3; // in cents less than 5 mins



interface ICall{
    phoneNumber: string;
    totalCallDuration: number; // total phone call duration
}

interface ICallCharge{
    phoneNumber: string;
    charge: number; // in cents
}


type Calls={ [ k:string]: number[] }; // k: phone number, array of calling times

// hh:mm:ss,NNN-NNN-NNN
const isValidateCallData=(callData: string)=>{
    const reg: RegExp = /[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}-[0-9]{3}-[0-9]{3}/g;
    return reg.test(callData);
}

function groupBy<T>(arr: T[], fn: (item: T) => any) {
    return arr.reduce<Record<string, T[]>>((prev, curr) => {
        const groupKey = fn(curr);
        const group = prev[groupKey] || [];
        group.push(curr);
        return { ...prev, [groupKey]: group };
    }, {});
}


const loadPhoneCalls=(): Calls=>{
    const calls:Calls ={};
    try {
        const data = fs.readFileSync('calls.txt', 'utf8');
        const lines = data.split('\n');

        lines.forEach(l=>{
            if(isValidateCallData(l)){
                const cd = l.split(',');
                const phoneNumber = cd[1];
                const duration = cd[0];
                const durationInSeconds = moment.duration(duration).asSeconds();

                if(calls[phoneNumber]){
                    calls[phoneNumber].push(durationInSeconds);
                }else {
                    calls[phoneNumber]=[durationInSeconds];
                }
            }
        });
    } catch (err) {
        console.error(err);
    }

    return calls;
}

const calculatePhonesCharges=()=>{

const calls = loadPhoneCalls();

const callCharges : Array<ICallCharge>=[];
const callDurations : Array<ICall>=[];

for (const phone in calls){

    calls[phone].forEach(d=>{
        let durationInMinutes = moment.duration(d).asMinutes() * 1000;

        if(durationInMinutes > 5){
            durationInMinutes = Math.ceil(durationInMinutes);
            callCharges.push({
                phoneNumber: phone,
                charge: durationInMinutes * LONGER_CALL_COST_PER_MINUTE
            });
        }else {
            callCharges.push({
                phoneNumber: phone,
                charge: d * SHORTER_CALL_COST_PER_SECOND
            });
        }
    });

   callDurations.push({
       phoneNumber: phone,
       totalCallDuration: calls[phone].reduce((p, c)=>p+c,0)
   })

}

    return {
        callCharges,
        callDurations
    };
}

const calculatePhoneBills=()=>{
    const callsInfo = calculatePhonesCharges();

    const phoneCallTotalCharge: {[p: string]: number}={};

    // build the dict of the total call of each phone number
    for(const phone of callsInfo.callCharges){
        const p = phone.phoneNumber;
        const c = phone.charge;

        if(phoneCallTotalCharge[p]){
            phoneCallTotalCharge[p]+= c;
        }else {
            phoneCallTotalCharge[p] = c;
        }
    }

const groupedCalls= groupBy(callsInfo.callDurations, c=>c.totalCallDuration);


// find the longest call by key of the group
// use this info to apply the discount per requirements

    const durations = Object.keys(groupedCalls).map(d=> Number(d));
    const sorted = durations.sort((a,b)=>b-a);
    const highestValueKey = sorted[0];

    if(groupedCalls[String(highestValueKey)].length > 1){
    const phoneNumbers= groupedCalls[String(highestValueKey)].map(c=>c.phoneNumber);
    const phoneNumbersNumerics = phoneNumbers.map(n=>Number(n.replace(/-/g,'')));

    const sortedNumbers = phoneNumbersNumerics.sort((a,b)=>a-b);
    const smallestNumerical = sortedNumbers[0];

    const smallPhoneKey = String(smallestNumerical).split(',',3).join('-');
        phoneCallTotalCharge[smallPhoneKey]=0;
    }
    else {
        phoneCallTotalCharge[groupedCalls[String(highestValueKey)][0].phoneNumber] = 0;
    }



    let totalCharge = 0;
    for (const k in phoneCallTotalCharge){
        totalCharge+=phoneCallTotalCharge[k]
    }


    return{
        phoneCallTotalCharge,
        totalCharge
    }

}

console.log(calculatePhoneBills());