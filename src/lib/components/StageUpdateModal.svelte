<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<script lang="ts">
  
  // Imports
  import { createEventDispatcher, onMount } from 'svelte';
  import type { SalesOrder } from '$lib/types';
  import type { PageData } from '../../routes/$types';
  import { slide } from 'svelte/transition';
  import { invalidateAll } from '$app/navigation';
  import { logStore, type LogEntry } from '../stores/LogStore';

  // Add these properties
  export let username: string;
  export let userRole: string;

  let showDetailsPopup = false;
  let selectedDcDetails: DcBox['dcDetails'] | null = null;

    function openDetailsPopup(details: DcBox['dcDetails']) {
    selectedDcDetails = details;
    showDetailsPopup = true;
  }

  function closeDetailsPopup() {
    showDetailsPopup = false;
    selectedDcDetails = null;
  }



interface DcBox {
  // ... other properties
  status?: 'Valid' | 'Invalid' | 'Error' | 'Not Found';
  dcDetails?: {
    dcNumber: string;
    customerName: string;
    companyName: string;
    dcDate: string;
    total: number;
    status: string;
    challanStatus: string;
    referenceNumber: string;
    branchName: string;
  };
}


async function validateAndShowDetails(dcNumber: string, index: number) {
  if (!dcNumber) {
    alert("Please enter a DC number");
    return;
  }

  try {
    const response = await fetch(`/api/validate-dc?dc_number=${encodeURIComponent(dcNumber)}`);
    const data = await response.json();
    console.log(data);

    if (data.error) {
      dcBoxes[index].status = 'Invalid';
      alert(data.error);
    } else if (data.deliverychallans && data.deliverychallans.length > 0) {
      const dc = data.deliverychallans[0];
      dcBoxes[index].status = 'Valid';
      dcBoxes[index].dcDetails = {
        dcNumber: dc.deliverychallan_number,
        customerName: dc.customer_name,
        companyName: dc.company_name,
        dcDate: dc.date,
        total: dc.total,
        status: dc.status,
        challanStatus: dc.challan_status,
        referenceNumber: dc.reference_number,
        branchName: dc.branch_name
      };
    } else {
      dcBoxes[index].status = 'Not Found';
    }
  } catch (error) {
    console.error('Error validating DC:', error);
    dcBoxes[index].status = 'Error';
    alert('An error occurred while validating the DC number');
  }

  dcBoxes = [...dcBoxes]; // Trigger reactivity
}

  let showAddMore = false;

  function toggleAddMore() {
    showAddMore = !showAddMore;
  }


  // Props and event dispatcher
  export let data: PageData;
  export let salesOrder: SalesOrder;
  const dispatch = createEventDispatcher();

  // Interfaces
  interface LineItem {
    id: string;
    SONumber: string;
    isAvailabilityFrozen: any;
    needToPurchaseLocally: boolean;
	  isAvailable: boolean;
    name: string;
    quantity: number;
    unit: string;
    rate: number;
    item_total: number;
    status: string;
    serialNo?: string;
    invoiceNo?: string;
    attachment?: string;
  }

  interface DCBox {
  dcDetails: { dcNumber: any; customerName: any; companyName: any; dcDate: any; total: any; status: any; challanStatus: any; referenceNumber: any; branchName: any; };
  status: any;
  SONumber: string;
  customName: string;
  trackingNo: string;
  dispatchedDate: string;
  deliveryDate: string;
  dcAmount: number;
  attachment: String;
  lineItemCount: number;
  isSaved: boolean;
  lineItemIndices: number[];
  fileName: string;
  filePreviewUrl: string | null;
  billType: 'DC' | 'E-way';
  isTypeSet: boolean;
}

  // Stage and form variables
  let currentStage = 0;
  let stageData = [
  { title: 'Stage 0. Site Not Ready', completed: false, visible: true },
  { title: 'Stage 1. Logistics', completed: false, visible: true },
  { title: 'Stage 2. Material to Procure', completed: false, visible: true },
  { title: 'Stage 3. On Going', completed: false, visible: true },
  { title: 'Stage 4. Return Pickup', completed: false, visible: false },
  { title: 'Stage 5. Share with Account', completed: false, visible: true }
];

  export let Stage0Data: any;

    Stage0Data = {
    SONumber: salesOrder.salesorder_number,
    clientName: salesOrder.customer_name,
    SubTotal: salesOrder.sub_total,
    Total: salesOrder.total,
    SOCategory : salesOrder.custom_field_hash.cf_so_cat,
    projectManagerName : salesOrder.custom_field_hash.cf_project_manager_name,
    clientExpectedDate : ''
  };
  let Stage3Data={
    SONumber: salesOrder.salesorder_number,
    engName:'',
    ScheduleDate:'',
    MobNo:'',
    VendorName:'',
    Remark:'',
    Report:'',
    Ticketid:''
  };
  let Stage4Data = {
    SONumber: salesOrder.salesorder_number,
    ReturnPickupName : '',
    ReturnPickupMobile : '',
    ReturnPickupRemark : '',
    DCNumber:'',
    CourierTrackNo:'',
    DCAmount:'',
    DispatchDate:'',
    DeliveryDate:'',
    Remark:'',
    Attachment:''
  }

  let isEditing = true;
  let partialDelivery = false;
  let canAccessNextStage = false;
  let allItemsSaved = false;
  let newlyAvailableItems: Array<{ id: string, name: string, status: 'available' | 'need_to_purchase' }> = [];  let notAvailableItems: LineItem[] = [];
   // Map line items with status
  let lineItemsWithStatus: LineItem[] = salesOrder.line_items.map(item => ({
    ...item,
    id: `${item.name}_${item.quantity}`,
    status: '',
    isAvailable: false,
    isAvailabilityFrozen: false,
    SONumber: salesOrder.salesorder_number,
    needToPurchaseLocally: false
  }));
  let minDate: string;

function updateMinDate() {
  minDate = new Date().toISOString().split('T')[0];
}

onMount(() => {
  updateMinDate();
  const interval = setInterval(updateMinDate, 60000); // Update every minute
  return () => clearInterval(interval);
});
  

  let dcOrderTotal = { subtotal: 0, igst: 0, total: 0 };
  let frozenLineItems: { [key: string]: boolean } = {};
  let dcBoxes: DCBox[] = [{
        dcDetails: { dcNumber: '', customerName: '', companyName: '', dcDate: '', total: '', status: '', challanStatus: '', referenceNumber: '', branchName: '' },
        SONumber: salesOrder.salesorder_number,
        customName: '',
        status: '',
        trackingNo: '',
        dispatchedDate: '',
        deliveryDate: '',
        dcAmount: 0,
        attachment: '',
        lineItemCount: 0,
        isSaved: false,
        lineItemIndices: [],
        fileName: '',
        filePreviewUrl: null,
        billType: 'DC', // Default to DC
        isTypeSet: false, 
    }];
  let dcCounter = 1;

  // Reactive declarations
  $: allStatusesFilled = lineItemsWithStatus.every(item => item.status !== '');
  $: partialDelivery = lineItemsWithStatus.some(item => item.status === 'not_available');

  // Lifecycle hooks
  onMount(() => {
    stageStartTimes[0] = getCurrentDateTime();
  });

  // Stage navigation functions
  function closeModal() {
    dispatch('close');
  }

  function goToNextStage() {
  if (currentStage < stageData.length - 1) {
    do {
      currentStage++;
    } while (currentStage < stageData.length && !stageData[currentStage].visible);
  }
}

function goToPreviousStage() {
  if (currentStage > 0) {
    do {
      currentStage--;
    } while (currentStage > 0 && !stageData[currentStage].visible);
  }
}

  function editStage() {
    isEditing = true;
  }

  // Form submission and validation
  function handleSubmit(event: Event) {
    event.preventDefault();
    if (currentStage === 2) {
    if (allItemsSaved) {
      showConfirmationPopup = true;
    } else {
      alert("Please save all items before submitting the stage.");
    }
  } 

    if (currentStage === (stageData[4].visible ? 5 : 4)) {
      // Share with Account stage
      const allItemsHaveStatus = [...shipments, returnPickup]
        .filter(item => item.isSaved)
        .every(item => item.accountStatus && item.accountRemark.trim());
      
      if (allItemsHaveStatus) {
        showConfirmationPopup = true;
      } else {
        alert("Please select a status and fill up the remark for all items.");
      }
    } else {
      showConfirmationPopup = true;
    }
  
    if (currentStage === 1){
      if (lineItemsWithStatus.every(item => item.status === 'not_available')) {
        // All items are not available, show confirmation dialog
        if (confirm('All items are marked as Not Available. Do you want to proceed to Material to Procure stage?')) {
          currentStage = 2; // Move to Material to Procure stage
          notAvailableItems = lineItemsWithStatus.filter(item => item.status === 'not_available');
        }
      } 
    }
  }

  async function confirmSubmit() {
    showConfirmationPopup = false;
    lastSubmittedTimes[currentStage] = getCurrentDateTime();
    // Set the start time for the next stage
    if (currentStage < stageData.length - 1) {
      stageStartTimes[currentStage + 1] = getCurrentDateTime();
    }
    
    switch (currentStage) {
    case 0:
      try {
        await fetch(`/submit-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: currentStage, data: Stage0Data })});
      }
      catch (error) {
          console.error('Error:', error);
      } break;
      
      
    case 1:
      if (!allStatusesFilled) {
        alert('Please select a status for all line items before submitting.');
        return;
      }
      // Check if all items are marked as "Not Required"
      const allNotRequired = lineItemsWithStatus.every(item => item.status === 'not_required');
        
      // Only check isCurrentDCFilled() if not all items are "Not Required"
      if (!allNotRequired && !isCurrentDCFilled()) {
        alert('Please fill all fields in the current DC before submitting.');
        return;
      }
      
      updateDCAmount(dcBoxes.length - 1);
      updateDCOrderTotal();
      saveCurrentState();
      alert('Logistics stage completed successfully.');
      break;
    case 2:
      if (allItemsSaved) {
        alert('Material to Procure stage completed successfully.');
        stageData[currentStage].completed = true;
        goToNextStage();
      } else {
        alert("Please save all items before submitting the stage.");
      }
      break;
    case 3:
        try {
          await fetch(`/submit-stage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: currentStage, data: Stage3Data })});
        }
        catch (error) {
          console.error('Error:', error);
        }
      alert("Ongoing stage has completed");
      break;
      case 4:
    if (stageData[4].visible) {
      if (returnPickup.isSaved) {
        alert("Return Pickup details submitted successfully.");
        stageData[4].completed = true;
        currentStage = 5; // Move to Share with Account stage
      } else {
        alert("Please save the Return Pickup details before submitting.");
        return;
      }
    } else {
      // Handle the case when Return Pickup is not visible (skipped)
      alert("Moving to Share with Account stage.");
      currentStage = 5;
    }
    break;
    case (stageData[4].visible ? 5 : 4):
    const approvedItems = [...shipments, returnPickup]
      .filter(item => item.isSaved && item.accountStatus === 'approved')
      .map(item => item.name || `Shipment ${item.index + 1}`);
    const rejectedItems = [...shipments, returnPickup]
      .filter(item => item.isSaved && item.accountStatus === 'rejected')
      .map(item => item.name || `Shipment ${item.index + 1}`);
    
    if (approvedItems.length > 0) {
      alert(`Approved items: ${approvedItems.join(', ')}`);
    }
    if (rejectedItems.length > 0) {
      alert(`Rejected items: ${rejectedItems.join(', ')}`);
      showRejectionAlert = true;
    }
    break;
    }

    stageData[currentStage].completed = true;
    // Automatically move to the next stage
    goToNextStage();
  }

  // Helper functions
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }



  // DC box related functions
  let totalSavedDCAmount = 0;
  function calculateDCAmount(dcIndex: number) {
    return lineItemsWithStatus
      .filter((item, index) => 
        (item.status === 'available' || item.status === 'need_to_purchase') && 
        !frozenLineItems[index] &&
        index >= (dcIndex > 0 ? dcBoxes[dcIndex - 1].lineItemCount : 0)
      )
      .reduce((sum, item) => sum + item.item_total, 0);
  }

  function updateDCOrderTotal() {
    if (allItemsNotAvailable) {
      dcOrderTotal.subtotal = 0;
    } else {
      // Calculate total of unsaved line items
    dcOrderTotal.subtotal = lineItemsWithStatus
      .filter((item) => !frozenLineItems[item.id] && (item.status === 'available' || item.status === 'need_to_purchase'))
      .reduce((sum, item) => sum + item.item_total, 0);
    }
    // Update the UI
    dcOrderTotal = dcOrderTotal; // Trigger reactivity
  }
  
  function getTotalSavedDCAmount() {
    return dcBoxes
      .filter(dc => dc.isSaved)
      .reduce((sum, dc) => sum + dc.dcAmount, 0);
  }
  
  function updateTotalSavedDCAmount() {
    totalSavedDCAmount = dcBoxes
      .filter(dc => dc.isSaved)
      .reduce((sum, dc) => sum + dc.dcAmount, 0);
  }

  function saveCurrentState() {
    console.log('Saving current state:', {
      lineItems: lineItemsWithStatus,
      dcOrderTotal,
      partialDelivery,
      dcBoxes
    });
    // Implement actual saving logic here
  }
  function canSaveDC(dc: DCBox): boolean {
    return lineItemsWithStatus.every(item => item.status !== '');
  }

  async function handleSave() {
    const currentDCIndex = dcBoxes.length - 1;
    const currentDC = dcBoxes[currentDCIndex];
  
    if (!canSaveDC(currentDC)) {
      alert('Please select a status for all line items before saving.');
      return;
    }

    // If the bill type hasn't been set yet (user didn't interact with the form),
    // set it now based on the current subtotal
    if (!currentDC.isTypeSet) {
        currentDC.billType = dcOrderTotal.subtotal >= 50000 ? 'E-way' : 'DC';
        currentDC.isTypeSet = true;
    }
  
    // Rest of the save logic
    lastSavedTimes[currentStage] = getCurrentDateTime();

    // Set the DC amount to the current total before saving if it's not already saved
    if (!currentDC.isSaved) {
        currentDC.dcAmount = dcOrderTotal.subtotal;
    }
    try {
      await fetch(`/submit-stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: currentStage, 
        data: {
        lineItems: lineItemsWithStatus,
        dcBoxes: currentDC
      } })});
    }catch (error) {
      console.error('Error:', error);
    }

  // Associate newly available or purchasable items with the current DC
  lineItemsWithStatus.forEach((item, index) => {
    if ((item.status === 'available' || item.status === 'need_to_purchase') && !frozenLineItems[item.id]) {
      frozenLineItems[item.id] = true;
      currentDC.lineItemIndices.push(index);
    }
    if ((item.status === 'not_required') && !frozenLineItems[item.id]) {
        frozenLineItems[item.id] = true;
      }
  });
  // Ensure all items in the current DC are marked as frozen
  currentDC.lineItemIndices.forEach(index => {
    frozenLineItems[lineItemsWithStatus[index].id] = true;
  });

  notAvailableItems = lineItemsWithStatus.filter(item => item.status === 'not_available');

  currentDC.isSaved = true;
  dcBoxes = [...dcBoxes];

  // Reset the total amount for the next DC
  updateDCOrderTotal();
      
  // Update the total of saved DCs
  updateTotalSavedDCAmount();
  saveCurrentState();
  canAccessNextStage = true;
  if (allItemsNotAvailable) {
        alert('All items are marked as Not Available. You cannot add more DCs.');
      } else {
        alert('Progress saved. You can now add more DCs or proceed to the next stage.');
      }
  }

  // Function to remove DC
  function removeDC(index: number) {
    if (index > 0 && !dcBoxes[index].isSaved) {
      dcBoxes.splice(index, 1);
      dcBoxes = dcBoxes; // Trigger reactivity
    }
  }

  // Function to add more DC
  function addMoreDC() {
    const currentDC = dcBoxes[dcBoxes.length - 1];
    if (!currentDC.isSaved) {
      alert('Please save the current DC before adding a new one.');
      return;
  }

  dcCounter++;
  dcBoxes = [...dcBoxes, {
    dcDetails: { dcNumber: '', customerName: '', companyName: '', dcDate: '', total: '', status: '', challanStatus: '', referenceNumber: '', branchName: '' },
    SONumber: salesOrder.salesorder_number,
	  customName: '',
	  trackingNo: '',
	  dispatchedDate: '',
	  deliveryDate: '',
	  dcAmount: 0,
	  attachment: '',
	  lineItemCount: 0,
	  lineItemIndices: [],
	  isSaved: false,
	  fileName: '',
	  filePreviewUrl: null,
	  status: '' ,
    billType: 'DC', // Default to DC
    isTypeSet: false, 
  }];
    // Recalculate the total for the new DC
    updateDCOrderTotal();
  }
function setBillType(index: number) {
  if (!dcBoxes[index].isTypeSet) {
    dcBoxes[index].billType = dcOrderTotal.subtotal >= 50000 ? 'E-way' : 'DC';
    dcBoxes[index].isTypeSet = true;
    dcBoxes = [...dcBoxes]; // Trigger reactivity
  }
}

  // Function to check if current DC is filled  
  function isCurrentDCFilled() {
    const currentDC = dcBoxes[dcBoxes.length - 1];
    return currentDC.customName.trim() && 
        currentDC.trackingNo && 
        currentDC.dispatchedDate && 
        currentDC.deliveryDate && 
        (currentDC.attachment || currentDC.fileName || currentDC.filePreviewUrl);
  }

// Function to update DC amount
function updateDCAmount(dcIndex: number) {
  const dc = dcBoxes[dcIndex];
  if (!dc.isSaved) {
  dc.dcAmount = dc.lineItemIndices.reduce((sum, index) => {
    const item = lineItemsWithStatus[index];
    return sum + item.item_total;
  }, 0);
  dcBoxes = dcBoxes; // Trigger reactivity
  }
}
  // File handling functions
  // Reactive statement for partial delivery and DC order total
  $: {
    partialDelivery = lineItemsWithStatus.some(item => item.status === 'not_available');
    updateDCOrderTotal();
  }

  // Function to set max dispatch date
  function setMaxDispatchDate() {
    const dispatchedDateInput = document.getElementById('dispatched-date') as HTMLInputElement;
    if (dispatchedDateInput) {
      dispatchedDateInput.max = new Date().toISOString().split('T')[0];
    }
  }

  // Function to update min delivery date
  function updateMinDeliveryDate() {
    const dispatchedDateInput = document.getElementById('dispatched-date') as HTMLInputElement;
    const deliveryDateInput = document.getElementById('delivery-date') as HTMLInputElement;
    
    if (dispatchedDateInput && deliveryDateInput) {
      deliveryDateInput.min = dispatchedDateInput.value;
      
      // If the current delivery date is before the new min date, reset it
      if (deliveryDateInput.value && deliveryDateInput.value < deliveryDateInput.min) {
        deliveryDateInput.value = '';
      }
    }
  }

  // Function to validate file input
  function validateFileInput(input: HTMLInputElement) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    const file = input.files?.[0];
    
    if (file && !allowedTypes.includes(file.type)) {
      alert('Please select a PDF or image file.');
      input.value = ''; // Clear the input
    }
  }

  // Function to setup event listeners
  function setupEventListeners() {
    const dispatchedDateInput = document.getElementById('dispatched-date') as HTMLInputElement;
    const attachmentInput = document.getElementById('attachment') as HTMLInputElement;
    
    if (dispatchedDateInput) {
      dispatchedDateInput.addEventListener('change', updateMinDeliveryDate);
    }
    
    if (attachmentInput) {
      attachmentInput.addEventListener('change', () => validateFileInput(attachmentInput));
    }
  }
    
  // Variables for date handling
  let dispatchedDate: string = '';
  let deliveryDate: string = '';

  // Reactive statement for date validation
  $: if (dispatchedDate) {
    // Ensure delivery date is not before dispatched date
    if (deliveryDate && deliveryDate < dispatchedDate) {
      deliveryDate = '';
    }
  }

  // Variables for file handling
  let filePreviewUrl: string | null = null;
  let fileName: string = '';

  // Function to handle file change
  async function handleFileChange(event: Event, dcIndex: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
      if (file) {
        try{
          const base64String = await convertFileToBase64(file);
          dcBoxes[dcIndex].fileName = file.name;
          dcBoxes[dcIndex].filePreviewUrl = URL.createObjectURL(file);
          dcBoxes[dcIndex].attachment = base64String;
        }catch (error) {
          console.error('Error converting file to base64:', error);}
      }
      dcBoxes = [...dcBoxes]; // Trigger reactivity
    }

  // Function to open preview modal
  function openPreviewModal(dcIndex: number) {
    const dc = dcBoxes[dcIndex];
    if (dc.filePreviewUrl) {
      const modal = document.getElementById('previewModal');
      const previewImage = document.getElementById('previewImage') as HTMLImageElement;
      const previewIframe = document.getElementById('previewIframe') as HTMLIFrameElement;
      
      if (modal && previewImage && previewIframe) {
        modal.style.display = 'block';
        if (dc.fileName.toLowerCase().endsWith('.pdf')) {
          previewIframe.src = dc.filePreviewUrl;
          previewIframe.style.display = 'block';
          previewImage.style.display = 'none';
        } else {
          previewImage.src = dc.filePreviewUrl;
          previewImage.style.display = 'block';
          previewIframe.style.display = 'none';
        }
      }
    }
  }
  // Function to close preview modal
  function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

 
  // For downloading from a URL (Stage 1)
function downloadFileFromUrl(url: string | null, fileName: string) {
  if (url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    console.error('No file available for download');
  }
}

  // Function to go to next page
  function goToNextPage() {
    if (currentStage < stageData.length - 1) {
      currentStage++;
    }
  }

  // Stage 2 related functions
  let showSaveButton = false;
let showLogisticsAlert = false;


function handleAvailabilityChange(itemId: string, newStatus: 'available' | 'need_to_purchase') {
  const item = notAvailableItems.find(item => item.id === itemId);
  if (item) {
    if (newStatus === 'available') {
      item.isAvailable = true;
      item.needToPurchaseLocally = false;
    } else if (newStatus === 'need_to_purchase') {
      item.needToPurchaseLocally = true;
      item.isAvailable = false;
    }
    
    // Reset the serialNo and invoiceNo when changing status
    item.serialNo = '';
    item.invoiceNo = '';
    item.attachment = undefined;

    // Add the item to newlyAvailableItems
    if (!newlyAvailableItems.some(newItem => newItem.id === item.id)) {
      newlyAvailableItems.push({
        id: item.id,
        name: item.name,
        status: newStatus
      });
    }

    // Trigger reactivity
    notAvailableItems = notAvailableItems;
    newlyAvailableItems = newlyAvailableItems;
    showSaveButton = true;
    allItemsSaved = false;
  }
}

function handleAttachmentChange(event: Event, itemId: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (file) {
    const item = notAvailableItems.find(item => item.id === itemId);
    if (item) {
      item.attachment = file;
      notAvailableItems = notAvailableItems; // Trigger reactivity
    }
  }
}

function handleSaveMaterialToProcure() {
  const itemsToUpdate = notAvailableItems.filter(item => item.isAvailable || item.needToPurchaseLocally);
  
  if (itemsToUpdate.length === 0) {
    alert("No changes to save.");
    return;
  }

  const invalidItems = itemsToUpdate.filter(item => !item.serialNo || !item.invoiceNo);
  if (invalidItems.length > 0) {
    alert("Please fill in both Serial No. and Invoice No. for all selected items.");
    return;
  }

  const itemSummary = itemsToUpdate.map(item => 
    `${item.name}: ${item.isAvailable ? 'Available' : 'Need to purchase locally'}`
  ).join('\n');

  if (confirm(`Are you sure you want to update the following items?\n\n${itemSummary}`)) {
    itemsToUpdate.forEach(item => {
      item.isAvailabilityFrozen = true;
      const index = lineItemsWithStatus.findIndex(lineItem => lineItem.id === item.id);
      if (index !== -1) {
        lineItemsWithStatus[index].status = item.isAvailable ? 'available' : 'need_to_purchase';
        lineItemsWithStatus[index].serialNo = item.serialNo;
        lineItemsWithStatus[index].invoiceNo = item.invoiceNo;
        lineItemsWithStatus[index].attachment = item.attachment;
      }
      
      if (!newlyAvailableItems.some(newItem => newItem.id === item.id)) {
        newlyAvailableItems.push({
          id: item.id,
          name: item.name,
          status: item.isAvailable ? 'available' : 'need_to_purchase'
        });
      }
    });
    
    notAvailableItems = notAvailableItems.filter(item => !item.isAvailable && !item.needToPurchaseLocally);
    showSaveButton = false;
    showLogisticsAlert = true;
    
    // Update the reactive variables
    lineItemsWithStatus = [...lineItemsWithStatus];
    notAvailableItems = [...notAvailableItems];
    newlyAvailableItems = [...newlyAvailableItems];
    
    const availableItems = itemsToUpdate.filter(item => item.isAvailable).map(item => item.name);
    const purchaseLocallyItems = itemsToUpdate.filter(item => item.needToPurchaseLocally).map(item => item.name);
    
    let alertMessage = "";
    if (availableItems.length > 0) {
      alertMessage += `The following items are now available:\n${availableItems.join(", ")}\n\n`;
    }
    if (purchaseLocallyItems.length > 0) {
      alertMessage += `The following items need to be purchased locally:\n${purchaseLocallyItems.join(", ")}\n\n`;
    }
    alertMessage += "Please complete the order in the Logistics stage.";
    
    alert(alertMessage);

    // Check if all items are saved
    allItemsSaved = notAvailableItems.length === 0;
  }
}

function openPreviewModalMaterial(item: LineItem) {
  const modal = document.getElementById('previewModal');
  const previewImage = document.getElementById('previewImage') as HTMLImageElement;
  const previewIframe = document.getElementById('previewIframe') as HTMLIFrameElement;
  
  if (modal && previewImage && previewIframe && item.attachment) {
    modal.style.display = 'block';
    const fileUrl = URL.createObjectURL(item.attachment);
    if (item.attachment.type === 'application/pdf') {
      previewIframe.src = fileUrl;
      previewIframe.style.display = 'block';
      previewImage.style.display = 'none';
    } else {
      previewImage.src = fileUrl;
      previewImage.style.display = 'block';
      previewIframe.style.display = 'none';
    }
  }
}

  // Stage 3 related functions
  interface Shipment {
    // ... other properties ...
    installationFile?: File;
    installationFileName?: string;
    serviceFile?: File;
    serviceFileName?: string;
    // ... other properties ...
  }
  let shipments: any[] = [{ isSaved: false, activeTab: 'installation', rejected: false, rejectionRemark: '' }];

  function validateMobileNumber(number: string): boolean {
    const regex = /^\d{10}$/;
    return regex.test(number);
  }
  function handleMobileInput(event: Event) {
      const input = event.target as HTMLInputElement;
      input.value = input.value.replace(/\D/g, '').slice(0, 10);
  }

  function saveShipment(index: number) {
  const shipment = shipments[index];
  if (isShipmentValid(shipment)) {
    shipment.isSaved = true;
    shipments = [...shipments];
    shipment.accountStatus = '';
    shipment.accountRemark = '';
    shipment.isEditing = false;
    alert(`${shipment.activeTab === 'installation' ? 'Installation' : 'Service'} details saved successfully.`);
    console.log('Saved shipment:', shipment); // Debug log
  } else {
    alert(`Please fill up all the ${shipment.activeTab === 'installation' ? 'installation' : 'service'} details before saving.`);
    console.log('Invalid shipment:', shipment); // Debug log
  }
  lastSavedTimes[currentStage] = getCurrentDateTime();
}

  function isShipmentValid(shipment: any): boolean {
    if (shipment.activeTab === 'installation') {  
      return Boolean(Stage3Data.engName && Stage3Data.ScheduleDate && 
             Stage3Data.MobNo && Stage3Data.MobNo.length === 10 &&
             Stage3Data.VendorName && Stage3Data.Remark && Stage3Data.Report);
    } else {
      return Boolean( Stage3Data.engName && Stage3Data.ScheduleDate && 
             Stage3Data.MobNo && Stage3Data.MobNo.length === 10 &&
             Stage3Data.VendorName && Stage3Data.Remark && Stage3Data.Report && Stage3Data.Ticketid);
    }
  }

  async function handleStage3FileChange(event: Event, type: 'installation' | 'service', index: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
      if (file && !shipments[index].isSaved) {
        try {
          const base64String = await convertFileToBase64(file);
          if (type === 'installation') {
            Stage3Data.Report = base64String;
         }else {
            Stage3Data.Report = base64String;
          }
        shipments = [...shipments]; // Trigger reactivity
        }catch (error) {
          console.error('Error converting file to base64:', error);}
    } lastSavedTimes[currentStage] = getCurrentDateTime();
  }

  function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
 }

  // Return pickup related functions

  function previewFile(file: File | string | null) {
  if (!file) return;

  const fileUrl = typeof file === 'string' ? file : URL.createObjectURL(file);
  const fileName = typeof file === 'string' ? 'file' : file.name;
  
  const modal = document.getElementById('filePreviewModal');
  const iframe = document.getElementById('filePreviewFrame') as HTMLIFrameElement;

  if (modal && iframe) {
    iframe.src = fileUrl;
    modal.style.display = 'block';
  }
}

function downloadFile(file: File | undefined, fileName: string) {
    if (!file) {
      console.error('No file to download');
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function closeFilePreviewModal() {
  const modal = document.getElementById('filePreviewModal');
  if (modal) {
    modal.style.display = 'none';
  }
}


let returnPickup = {
    name: '',
    mobile: '',
    remark: '',
    file: null as File | any,
    fileName: '',
    filePreviewUrl: null as string | null,
    isSaved: false,
    isDataSaved: false,
    rejected: false,
    rejectionRemark: '',
    accountStatus: '',
    accountRemark: '',
    isEditing: false,
    dcNumber: '',
    trackingNo: '',
    dcAmount: '',
    dispatchedDate: '',
    deliveryDate: '',
    dcaccountRemark: ''
  };

  let returnPickupRequested = false;
  let showReturnPickupConfirmation = false;
  let showConfirmationPopup = false;
  let returnPickupDetailsSaved = false;
  let returnPickupName = '';
  let returnPickupMobile = '';
  let returnPickupRemark = '';

  function toggleReturnPickup() {
    if (returnPickupRequested && !returnPickupDetailsSaved) {
      // If cancelling and details are not saved, reset the state
      returnPickupRequested = false;
      returnPickupName = '';
      returnPickupMobile = '';
      returnPickupRemark = '';
    } else if (!returnPickupRequested) {
      // If requesting, show the details form
      returnPickupRequested = true;
    }
}

function saveReturnPickupDetails() {
  if (Stage4Data.ReturnPickupName && Stage4Data.ReturnPickupMobile.length === 10 && Stage4Data.ReturnPickupRemark) {
    showReturnPickupConfirmation = true;
  } else {
    alert("Please fill in all fields correctly before saving.");
  }
}

async function confirmReturnPickup() {
  showReturnPickupConfirmation = false;
  returnPickupDetailsSaved = true;
  try {
    await fetch(`/submit-stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: currentStage, data: Stage4Data })});
    alert("Return Pickup request confirmed. Details have been saved and can no longer be edited.");
  }
  catch (error) {
    console.error('Error:', error);
  }
  
}



function handleReturnPickupMobileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const oldValue = input.value;
  const newValue = oldValue.replace(/\D/g, '').slice(0, 10);
  
  if (oldValue !== newValue) {
       Stage4Data.ReturnPickupMobile = newValue;
    alert("Please enter only digits. The mobile number should be 10 digits long.");
  }
}

  async function handleReturnPickupFileChange(event: Event, index: number) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (file && !returnPickup.isSaved) {
      returnPickup.file = file;
      returnPickup.fileName = file.name;
      returnPickup = {...returnPickup}; // Trigger reactivity
    }
    lastSavedTimes[currentStage] = getCurrentDateTime();
  }

  function saveReturnPickup() {
    if (isReturnPickupComplete()) {
      returnPickup.isSaved = true;
      returnPickup.isDataSaved = true;
      alert("Return Pickup details saved successfully. You can no longer edit this entry.");
    } else {
      alert("Please fill up all the Return Pickup details.");
    }
  }

  function isReturnPickupComplete(): boolean {
    return (
      returnPickup.name.trim() !== '' &&
      returnPickup.mobile.length === 10 &&
      returnPickup.remark.trim() !== '' &&
      returnPickup.file !== null &&
      returnPickup.dcNumber.trim() !== '' &&
      returnPickup.trackingNo.trim() !== '' &&
      returnPickup.dcAmount.trim() !== '' &&
      returnPickup.dispatchedDate !== '' &&
      returnPickup.deliveryDate !== '' &&
      returnPickup.dcaccountRemark.trim() !== ''
    );
  }

  function formatAmountreturn(event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value.replace(/[^\d.]/g, '');
  
  // Allow only one decimal point
  const parts = value.split('.');
  if (parts.length > 2) {
    parts.pop();
    value = parts.join('.');
  }
  
  // Format with commas for thousands
  const [wholePart, decimalPart] = value.split('.');
  let formattedWholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  // Combine whole part and decimal part (if exists)
  let formatted = formattedWholePart;
  if (decimalPart !== undefined) {
    formatted += '.' + decimalPart;
  }

  // Update the input value and the returnPickup object
  input.value = formatted;
    returnPickup.dcAmount = formatted;
}

function getCurrentDateTime(): string {
  return new Date().toLocaleString();
}

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function updateDeliveryDateMin() {
    if (returnPickup.dispatchedDate > returnPickup.deliveryDate) {
      returnPickup.deliveryDate = returnPickup.dispatchedDate;
    }
}

  // Share with account related variables
  let accountStatus = '';
  let accountRemark = '';
  let showRejectionAlert = false;
  let canEditOngoing = false;
  let canEditReturnPickup = false;

  // Reactive statements
  $: {
    if (returnPickupRequested) {
      stageData[4].visible = true;
    } else {
      stageData[4].visible = false;
    }
  }

  $: {
    partialDelivery = lineItemsWithStatus.some(item => item.status === 'not_available');
    updateDCOrderTotal();
  }

  $: {
    if (showRejectionAlert) {
      canEditOngoing = true;
      canEditReturnPickup = true;
    }
  }

  $: {
  if (partialDelivery) {
    stageData[2].visible = true;
  } else {
    stageData[2].visible = false;
  }
}
$: allItemsNotAvailable = lineItemsWithStatus.every(item => item.status === 'not_available');

  // Time tracking
  let stageStartTimes: { [key: number]: string } = {};
  let lastSavedTimes: { [key: number]: string } = {};
  let lastSubmittedTimes: { [key: number]: string } = {};

  async function handleFieldUpdate(fieldName: string, oldValue: string, newValue: string) {
    const action = `Updated ${fieldName} from "${oldValue}" to "${newValue}"`;
    
    try {
      const response = await fetch('/api/log-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesOrderId: Stage0Data.SONumber,
          username: username,
          role: userRole,
          action: action
        })
      });

      if (!response.ok) {
        throw new Error('Failed to log activity');
      }

      // Update the local state
      if (fieldName === "SO Category") {
        Stage0Data.SOCategory = newValue;
      } else if (fieldName === "Project Manager") {
        Stage0Data.projectManagerName = newValue;
      }

      // Invalidate and refresh the page data
      await invalidateAll();
    } catch (error) {
      console.error('Error logging activity:', error);
      // Handle the error (e.g., show a notification to the user)
    }
  }


</script>


<div role="dialog"
  aria-labelledby="modal-title" 
  class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" on:click|self={closeModal}>
  <div class="relative top-20 mx-auto p-8 border w-11/12 max-w-4xl shadow-lg rounded-lg bg-white">
    <button 
      on:click={closeModal}
      class="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
      aria-label="Close modal"
    >
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <h2 id="modal-title" class="text-3xl font-bold mb-6 text-gray-800">Stages</h2>
    
    <!-- Stage navigation -->
    <div class="mb-8 flex flex-wrap justify-center gap-3">
      {#each stageData as stage, index}
        {#if stage.visible !== false}
          <button
            class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 {
              stage.completed ? 'bg-green-500 text-white hover:bg-green-600' : 
              currentStage === index ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } {(!stage.completed && index > currentStage) ? 'opacity-50 cursor-not-allowed' : ''}"
            on:click={() => {
              if (stage.completed || index === currentStage) {
                currentStage = index;
              }
            }}
            disabled={!stage.completed && index > currentStage}
          >
            {stage.title}
          </button>
        {/if}
      {/each}
    </div>

    <div class="bg-white p-6 rounded-lg shadow-md">
      <form on:submit|preventDefault={handleSubmit}>
    <!-- Stage header -->
      <h3 class="text-2xl font-bold mb-6 text-gray-800">{stageData[currentStage].title}</h3>

      {#if currentStage === 0}
        <!-- API data fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2" for="so_number">
              SO Number
            </label>
            <input id="so_number" type="text" value={salesOrder.salesorder_number} readonly class="w-full px-3 py-2 border rounded-md bg-gray-100">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2" for="so_date">
              SO Date
            </label>
            <input id="so_date" type="text" value={new Date(salesOrder.date).toLocaleDateString()} readonly class="w-full px-3 py-2 border rounded-md bg-gray-100">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2" for="client_name">
              Client Name
            </label>
            <input id="client_name" type="text" value={salesOrder.customer_name} readonly class="w-full px-3 py-2 border rounded-md bg-gray-100">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2" for="purchase_order">
              Purchase Order
            </label>
            <input id="purchase_order" type="text" value={salesOrder.reference_number} readonly class="w-full px-3 py-2 border rounded-md bg-gray-100">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2" for="so_subtotal">
              SO Subtotal
            </label>
            <input id="so_subtotal" type="text" value={formatCurrency(salesOrder.sub_total)} readonly class="w-full px-3 py-2 border rounded-md bg-gray-100">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2" for="so_total">
              SO Total
            </label>
            <input id="so_total" type="text" value={formatCurrency(salesOrder.total)} readonly class="w-full px-3 py-2 border rounded-md bg-gray-100">
          </div>
        </div>

        <!-- Stage-specific fields -->
  <div class="mb-4 grid grid-cols-2 gap-4 form-card">
    <div>
      <label class="block text-gray-700 text-sm font-bold mb-2" for="so_category">
        SO Category
      </label>
      <input
        id="so_category" 
        value={salesOrder.custom_field_hash.cf_so_cat} 
        class="w-full px-3 py-2 border rounded-md" disabled
      >
    
    </div>
    <div>
      <label class="block text-gray-700 text-sm font-bold mb-2" for="project_manager">
        Project Manager Name
      </label>
      <input 
        id="project_manager" 
        value={salesOrder.custom_field_hash.cf_project_manager_name} 
        class="w-full px-3 py-2 border rounded-md" disabled
      >
    </div>
    <div>
      <label class="block text-gray-700 text-sm font-bold mb-2" for="client_expected_date">
        Client Expected Date of Handover *
      </label>
      <input 
        type="date" 
        id="client_expected_date" 
        bind:value={Stage0Data.clientExpectedDate} 
        on:change={(e) => handleFieldUpdate("Client Expected Date of Handover", Stage0Data.clientExpectedDate, e.target.value)}
        min={minDate}
        class="w-full px-3 py-2 border rounded-md" 
        disabled={!isEditing} 
        required
      >
    </div>
    
  </div>
   
        
        {:else if currentStage === 1}
          <!-- Logistics stage content -->
          {#if showLogisticsAlert}
          <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 relative form-card" role="alert">
            <p class="font-bold">The following items have new statuses:</p>
            {#if newlyAvailableItems.some(item => item.status === 'available')}
            <p class="font-semibold mt-2">Available Items:</p>
            <ul class="list-disc list-inside mt-1">
        {#each newlyAvailableItems.filter(item => item.status === 'available') as item}
          <li>{item.name}</li>
              {/each}
            </ul>
            {/if}
    
            {#if newlyAvailableItems.some(item => item.status === 'need_to_purchase')}
              <p class="font-semibold mt-2">Need to Purchase Locally:</p>
              <ul class="list-disc list-inside mt-1">
                {#each newlyAvailableItems.filter(item => item.status === 'need_to_purchase') as item}
                  <li>{item.name}</li>
                {/each}
              </ul>
            {/if}
            <p class="mt-2">Please complete the order for these items in the Logistics stage.</p>
            <button 
              class="absolute top-0 right-0 mt-2 mr-2 text-yellow-700 hover:text-yellow-900"
              on:click={() => {
                showLogisticsAlert = false;
                newlyAvailableItems = [];
              }}
            >
              ×
            </button>
          </div>
        {/if}
          <div class="mb-4">
            <h4 class="text-lg font-bold mb-2">Line Items</h4>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each lineItemsWithStatus as item, index (item.id)}
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity} {item.unit}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.rate)}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.item_total)}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select bind:value={lineItemsWithStatus[index].status} class=" w-32 px-2 py-1 border rounded-md" disabled={frozenLineItems[item.id]} >
                          <option value="">Select status</option>
                          <option value="available">Available</option>
                          <option value="not_available">Not Available</option>
                          <option value="need_to_purchase">Need to purchase locally</option>
                          <option value="not_required">Not Required</option>
                        </select>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
          <!-- New reactive statement to check if all items are Not Available or Not Required -->
  
          {#if lineItemsWithStatus.every(item => item.status === 'not_available')}
          <div class="mt-4 mb-4 text-center text-lg font-bold text-red-600">
            All items are marked as Not Available. You can submit directly.
          </div>
        {:else if lineItemsWithStatus.every(item => item.status === 'not_required')}
          <div class="mt-4 mb-4 text-center text-lg font-bold text-green-600">
            All items are marked as Not Required. You can submit directly.
          </div>
        {:else}
        <!-- Partial Delivery toggle -->
  {#if lineItemsWithStatus.some(item => item.status === 'not_available')}
  <div class="mt-4">
    <label class="inline-flex items-center">
      <input type="checkbox" bind:checked={partialDelivery} class="form-checkbox">
      <span class="ml-2">Partial Delivery</span>
    </label>
  </div>
{/if}


<!-- DC Order Total section -->
<div class="flex justify-between items-center mt-4">
  <div class="flex-1">
    <h4 class="text-lg font-bold mb-2 inline-block mr-2">Current Unsaved Total:</h4>
    <p class="inline-block">{formatCurrency(dcOrderTotal.subtotal)}</p>
  </div>
  <div class="w-px h-10 bg-gray-300 mx-4"></div>
  <div class="flex-1 text-right">
    <h4 class="text-lg font-bold mb-2 inline-block mr-2">Total of Saved DCs or E-ways:</h4>
    <p class="inline-block">{formatCurrency(totalSavedDCAmount)}</p>
  </div>
</div>

         <!-- Display current unsaved total -->
  <!-- <div class="mt-4">
    <h4 class="text-lg font-bold mb-2 inline-block mr-2">Current Unsaved Total:</h4>
    <p class="inline-block">{formatCurrency(dcOrderTotal.subtotal)}</p>
  </div> -->
        {#each dcBoxes as dc, index}
              <div class="bg-white bg-opacity-50 p-6 rounded-lg shadow-md mb-8 relative form-card">
                {#if !dc.isSaved && index !== 0}
                  <button
                    type="button"
                    class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl font-bold"
                    on:click={() => removeDC(index)}
                  >
                    ×
                  </button>
                {/if}
                <div class="bg-white bg-opacity-50 p-6 rounded-lg shadow-md mb-8">
                  <h4 class="text-lg font-bold mb-4">DC or E-way Bill Details</h4>
                  <div class="flex items-center mb-4 space-x-4">
                  <div class="flex items-center mb-4 space-x-4">
                    <div class="flex-1">
                      <label for="dc-number-{index}" class="block text-sm font-medium text-gray-700">
                        {dc.billType === 'E-way' ? 'E-way Number:' : 'DC Number:'}
                      </label>
                      <input 
                        type="text" 
                        id="dc-number-{index}"
                        bind:value={dc.customName} 
                        placeholder={dc.billType === 'E-way' ? "Enter E-way number" : "Enter DC number"}
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        disabled={dc.isSaved}
                      >
                      {#if dc.status}
                      <div class="mb-4">
                        <span class={`${dc.status === 'Valid' ? 'text-green-600' : 'text-red-600'}`}>
                          {dc.status}
                        </span>
                      </div>
                    {/if}
            
                    </div>
                    {#if dc.dcDetails && dc.status === 'Valid'}
                  <div class="flex-1">
                    <label for="dc-status-{index}" class="block text-sm font-medium text-gray-700">Status:</label>
                    <input 
                      id="dc-status-{index}" 
                      value="{dc.dcDetails.challanStatus}" 
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      disabled
                    />                    
                  </div>
                {/if}
                
                  <button
                  type="button"
                  class="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  on:click={() => validateAndShowDetails(dc.customName, index)}
                >
                  Validate
                </button>
                {#if dc.dcDetails && dc.status === 'Valid'}
                <button
                  type="button"
                  class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  on:click={() => openDetailsPopup(dc.dcDetails)}
                >
                  Show Details
                </button>
              {/if}
                </div>
              </div>

                                  <!-- Details Popup -->
{#if showDetailsPopup && selectedDcDetails}
<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
  <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
    <div class="mt-3 text-center">
      <h3 class="text-lg leading-6 font-medium text-gray-900">DC Details</h3>
      <div class="mt-2 px-7 py-3">
        <p class="text-sm text-gray-500 mb-1"><strong>DC Number:</strong> {selectedDcDetails.dcNumber}</p>
        <p class="text-sm text-gray-500 mb-1"><strong>Customer Name:</strong> {selectedDcDetails.customerName}</p>
        <p class="text-sm text-gray-500 mb-1"><strong>Company Name:</strong> {selectedDcDetails.companyName}</p>
        <p class="text-sm text-gray-500 mb-1"><strong>Date:</strong> {selectedDcDetails.dcDate}</p>
        <p class="text-sm text-gray-500 mb-1"><strong>Total:</strong> {selectedDcDetails.total.toFixed(2)} INR</p>
        <p class="text-sm text-gray-500 mb-1"><strong>Status:</strong> {selectedDcDetails.status}</p>
        <p class="text-sm text-gray-500 mb-1"><strong>Challan Status:</strong> {selectedDcDetails.challanStatus}</p>
        <p class="text-sm text-gray-500 mb-1"><strong>Reference Number:</strong> {selectedDcDetails.referenceNumber}</p>
        <p class="text-sm text-gray-500 mb-1"><strong>Branch Name:</strong> {selectedDcDetails.branchName}</p>
      </div>
      <div class="items-center px-4 py-3">
        <button
          id="ok-btn"
          class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          on:click={closeDetailsPopup}
        >
          Close
        </button>
      </div>
    </div>
  </div>
</div>
{/if}

              
              <!-- DC Boxes -->
              
                <!-- <div class="flex items-center mb-4">
                  <span class="text-xl font-semibold mr-2">{dcOrderTotal.subtotal >= 50000 ? 'E-way :' : 'DC :'}</span>
                  <input 
                    type="text" 
                    bind:value={dc.customName} 
                    placeholder={dcOrderTotal.subtotal >= 50000 ? "Enter E-way number" : "Enter DC number"}
                    class="border-b-2 border-gray-300 focus:border-blue-500 outline-1 px-2 py-1"
                    required disabled={dc.isSaved}
                  >
                </div> -->
                <div class="flex justify-center mb-8">
                  <div class="bill-type-buttons flex gap-6">
                    <button
                      class="px-8 py-3 border rounded-lg shadow-md {dc.billType === 'DC' ? 'bg-green-500 text-white border-green-500' : 'bg-white border-gray-300 text-gray-700'}"
                    >
                      DC Bill
                    </button>
                    <button
                     class="px-8 py-3 border rounded-lg shadow-md {dc.billType === 'E-way' ? 'bg-green-500 text-white border-green-500' : 'bg-white border-gray-300 text-gray-700'}"
                    >
                      E-way Bill
                    </button>
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="flex space-x-4">
                    <div class="flex-1">
                      <label for="tracking-no-{index}" class="block text-sm font-medium text-gray-700">POD Number:</label>
                      <input type="text" id="tracking-no-{index}" bind:value={dc.trackingNo} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required disabled={dc.isSaved}>
                    </div>

                    <div class="flex-1">
                      <label for="dispatched-date-{index}" class="block text-sm font-medium text-gray-700">Dispatched Date:</label>
                      <input type="date" id="dispatched-date-{index}" bind:value={dc.dispatchedDate} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" max={new Date().toISOString().split('T')[0]} required disabled={dc.isSaved}>
                    </div>

                    <div class="flex-1">
                      <label for="delivery-date-{index}" class="block text-sm font-medium text-gray-700">Estimated Delivery Date:</label>
                      <input type="date" id="delivery-date-{index}" bind:value={dc.deliveryDate} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" min={dc.dispatchedDate} required disabled={dc.isSaved}>
                    </div>

                    <div class="flex-1">
                      <label for="dc-amount-{index}" class="block text-sm font-medium text-gray-700">
                        {dc.billType === 'E-way' ? 'E-way Bill Amount:' : 'DC Amount:'}
                      </label>
                      <p id="dc-amount-{index}" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm">
                        {formatCurrency(dc.isSaved ? dc.dcAmount : dcOrderTotal.subtotal)}
                      </p>
                    </div>
                  </div>

                  <div class="flex-1">
                    <label for="attachment-{index}" class="block text-sm font-medium text-gray-700">Attachment:</label>
        {#if !dc.isSaved}
          <input 
            type="file" 
            id="attachment-{index}" 
            on:change={(e) => handleFileChange(e, index)}
            class="mt-1 block w-full" 
            accept="application/pdf,image/*" 
            required 
          >
        {/if}
        {#if dc.attachment || dc.fileName}
          <div class="mt-2">
            <span class="text-sm text-gray-600">{dc.fileName || 'File uploaded'}</span>
            <button 
              type="button" 
              on:click={() => openPreviewModal(index)}
              class="text-blue-600 hover:text-blue-800 ml-2"
            >
              Preview
                        </button>
                        <button 
                        type="button" 
                        on:click={() => downloadFileFromUrl(dc.filePreviewUrl, dc.fileName)}
              class="text-green-600 hover:text-green-800 ml-2"
                      >
                        Download
                      </button>
                      </div>
                    {/if}
                  </div>
                  
                  <!-- Preview Modal -->
                  <div id="previewModal" class="modal" style="display:none; position:fixed; z-index:1; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.4);">
                    <div class="modal-content" style="background-color:#fefefe; margin:15% auto; padding:20px; border:1px solid #888; width:80%;">
                      <span class="close" on:click={closePreviewModal} style="color:#aaa; float:right; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
                      <img id="previewImage" alt="File preview" style="max-width:100%; max-height:70vh; display:none;">
                      <iframe id="previewIframe" style="width:100%; height:70vh; display:none;"></iframe>
                    </div>
                  </div>

                  <!-- Line Items Table -->
              {#if dc.isSaved}
              <div class="mt-6">
                <h4 class="text-lg font-bold mb-2">Line Items in this {dcOrderTotal.subtotal >= 50000 ? 'E-way Bill' : 'DC'}</h4>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {#each dc.lineItemIndices as itemIndex, i}
                        {@const item = lineItemsWithStatus[itemIndex]}
                        <tr>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i + 1}</td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity} {item.unit}</td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.rate)}</td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.item_total)}</td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.status === 'need_to_purchase' ? 'Need to purchase locally' : 'Available'}
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
              {/if}
                </div>
              </div>
              </div>
           {/each}

  
  <div class="flex justify-between mt-4">
  <div class="space-x-2">
    <button 
      type="button" 
      on:click={handleSave} 
      class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      disabled={!canSaveDC(dcBoxes[dcBoxes.length - 1])}
    >
      Save
    </button>
    {#if !allItemsNotAvailable && lineItemsWithStatus.length>1}
        <button 
          type="button" 
          on:click={addMoreDC} 
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add more +
        </button>
      {/if}
  </div>
</div>
{/if}

{:else if currentStage === 2}
<!-- Material to Procure stage content -->
<div class="mb-4">
  <h4 class="text-xl font-bold mb-4 text-center">Not Available Items</h4>
  {#if notAvailableItems.length > 0}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Need to purchase locally</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each notAvailableItems as item, index (item.id)}
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity} {item.unit}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.rate)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.item_total)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <input 
                  type="checkbox" 
                  bind:checked={item.isAvailable} 
                  on:change={() => handleAvailabilityChange(item.id, 'available')}
                  disabled={item.isAvailabilityFrozen || item.needToPurchaseLocally}
                >
                {#if item.isAvailable}
                  <span class="ml-2 text-green-500">✓</span>
                {/if}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <input 
                  type="checkbox" 
                  bind:checked={item.needToPurchaseLocally} 
                  on:change={() => handleAvailabilityChange(item.id, 'need_to_purchase')}
                  disabled={item.isAvailabilityFrozen || item.isAvailable}
                >
                {#if item.needToPurchaseLocally}
                  <span class="ml-2 text-blue-500">✓</span>
                {/if}
              </td>
            </tr>
            {#if item.isAvailable || item.needToPurchaseLocally}
              <tr>
                <td colspan="7" class="px-6 py-4">
                  <div class="flex space-x-4">
                    <div class="flex-1">
                      <label for="serial-no-{item.id}" class="block text-sm font-medium text-gray-700">Serial No.: *</label>
                      <input 
                        type="text" 
                        id="serial-no-{item.id}" 
                        bind:value={item.serialNo} 
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        required
                      >
                    </div>
                    <div class="flex-1">
                      <label for="invoice-no-{item.id}" class="block text-sm font-medium text-gray-700">Invoice No.: *</label>
                      <input 
                        type="text" 
                        id="invoice-no-{item.id}" 
                        bind:value={item.invoiceNo} 
                        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        required
                      >
                    </div>
                    <div class="flex-1">
                      <label for="attachment-{item.id}" class="block text-sm font-medium text-gray-700">Attachment:</label>
                      <input 
                        type="file" 
                        id="attachment-{item.id}" 
                        on:change={(e) => handleAttachmentChange(e, item.id)}
                        class="mt-1 block w-full"
                        accept="application/pdf,image/*"
                      >
                      {#if item.attachment}
                        <div class="mt-2">
                          <span class="text-sm text-gray-600">{item.attachment.name}</span>
                          <button 
                            type="button" 
                            on:click={() => openPreviewModalMaterial(item)}
                            class="text-blue-600 hover:text-blue-800 ml-2"
                          >
                            Preview
                          </button>
                        </div>
                      {/if}
                    </div>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-center">No items marked as not available.</p>
  {/if}
</div>

{#if showSaveButton}
  <div class="flex justify-end mt-4">
    <button 
      type="button" 
      on:click={handleSaveMaterialToProcure}
      class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
    >
      Save
    </button>
  </div>
{/if}

{#if allItemsSaved}
  <div class="text-center mt-4 text-lg font-bold text-green-600">
    All items have been saved. You can now submit the stage.
  </div>
{/if}

<!-- Preview Modal -->
<div id="previewModal" class="modal" style="display:none; position:fixed; z-index:1; left:0; top:0; width:100%; height:100%; overflow:auto; background-color:rgba(0,0,0,0.4);">
  <div class="modal-content" style="background-color:#fefefe; margin:15% auto; padding:20px; border:1px solid #888; width:80%;">
    <span class="close" on:click={closePreviewModal} style="color:#aaa; float:right; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
    <img id="previewImage" alt="File preview" style="max-width:100%; max-height:70vh; display:none;">
    <iframe id="previewIframe" style="width:100%; height:70vh; display:none;"></iframe>
  </div>
</div>
 
  {:else if currentStage === 3}
   <!-- On Going stage content -->
   <div class="relative pb-16 ">
    
   <div class="mb-4">
    {#each shipments as shipment, index}
        <div class="mb-8 p-4 border rounded-lg relative form-card">
          {#if shipment.rejected}
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong class="font-bold">Rejected:</strong>
              <span class="block sm:inline"> {shipment.rejectionRemark}</span>
            </div>
          {/if}
          
          <!-- Dynamic header based on active tab -->
          <h5 class="text-lg font-semibold mb-4">
            {shipment.activeTab === 'installation' ? 'Installation Report' : 'Service Report'} 
          </h5>

          <!-- Toggle buttons for Installation and Service -->
          <div class="flex justify-center mb-4">
            <button
              class="px-4 py-2 {shipment.activeTab === 'installation' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-l"
              on:click={() => {
                if (!shipment.isSaved) {
                  shipment.activeTab = 'installation';
                  shipments = [...shipments];
                }
              }}
              disabled={shipment.isSaved}
            >
              Installation
            </button>
            <button
              class="px-4 py-2 {shipment.activeTab === 'service' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-r"
              on:click={() => {
                if (!shipment.isSaved) {
                  shipment.activeTab = 'service';
                  shipments = [...shipments];
                }
              }}
              disabled={shipment.isSaved}
            >
              Service
            </button>
          </div>

        {#if shipment.activeTab === 'installation'}
          <!-- Installation fields -->
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="engineer-name-{index}" class="block text-sm font-medium text-gray-700">Engineer name:</label>
                <input type="text" id="engineer-name-{index}" bind:value={Stage3Data.engName} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required disabled={shipment.isSaved}>
              </div>
              <div>
                <label for="schedule-date-{index}" class="block text-sm font-medium text-gray-700">Schedule date:</label>
                <input 
                  type="date" 
                  id="schedule-date-{index}" 
                  bind:value={Stage3Data.ScheduleDate} 
                  min={new Date().toISOString().split('T')[0]} 
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
                  required 
                  disabled={shipment.isSaved}
                >
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="mobile-number-{index}" class="block text-sm font-medium text-gray-700">Mobile number:</label>
                <input 
                  type="tel" 
                  id="mobile-number-{index}" 
                  bind:value={Stage3Data.MobNo} 
                  on:input={handleMobileInput}
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
                  pattern="[0-9]{10}"
                  maxlength="10"
                  required
                  disabled={shipment.isSaved}
                >
              </div>
              <div>
                <label for="vendor-name-{index}" class="block text-sm font-medium text-gray-700">Vendor name:</label>
                <input type="text" id="vendor-name-{index}" bind:value={Stage3Data.VendorName} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required disabled={shipment.isSaved}>
              </div>
            </div>
            <div>
              <label for="installation-remarks-{index}" class="block text-sm font-medium text-gray-700">Installation remarks:</label>
              <textarea id="installation-remarks-{index}" bind:value={Stage3Data.Remark} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" rows="3" disabled={shipment.isSaved}></textarea>
            </div>
            <div>
              <label for="installation-report-{index}" class="block text-sm font-medium text-gray-700">Installation report attachment:</label>
              {#if !shipment.isSaved}
              <input type="file" id="installation-report-{index}" on:change={(e) => handleStage3FileChange(e, 'installation', index)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="mt-1 block w-full" required>
            {/if}
              {#if Stage3Data.Report}
                <div class="mt-2">
                  <button 
                    type="button" 
                    on:click={() => previewFile(Stage3Data.Report)}
                    class="text-blue-600 hover:text-blue-800 mr-2"
                  >
                    Preview
                  </button>
                  <button 
                    type="button" 
                    on:click={() => downloadFile(shipment.installationFile, shipment.installationFileName)}
                    class="text-green-600 hover:text-green-800"
                  >
                    Download
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <!-- Service fields -->
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="service-engineer-name-{index}" class="block text-sm font-medium text-gray-700">Engineer name:</label>
                <input type="text" id="service-engineer-name-{index}" bind:value={Stage3Data.engName} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required disabled={shipment.isSaved}>
              </div>
              <div>
                <label for="service-schedule-date-{index}" class="block text-sm font-medium text-gray-700">Schedule date:</label>
                <input 
                  type="date" 
                  id="service-schedule-date-{index}" 
                  bind:value={Stage3Data.ScheduleDate} 
                  min={new Date().toISOString().split('T')[0]} 
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
                  required 
                  disabled={shipment.isSaved}
                >
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="service-mobile-number-{index}" class="block text-sm font-medium text-gray-700">Mobile number:</label>
                <input 
                    type="tel" 
                    id="service-mobile-number-{index}" 
                    bind:value={Stage3Data.MobNo} 
                    on:input={handleMobileInput}
                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
                    pattern="[0-9]{10}"
                    maxlength="10"
                    required
                    disabled={shipment.isSaved}
                  >
              </div>
              <div>
                <label for="service-vendor-name-{index}" class="block text-sm font-medium text-gray-700">Vendor name:</label>
                <input type="text" id="service-vendor-name-{index}" bind:value={Stage3Data.VendorName} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required disabled={shipment.isSaved}>
              </div>
            </div>
            <div>
              <label for="service-remarks-{index}" class="block text-sm font-medium text-gray-700">Service remarks:</label>
              <textarea id="service-remarks-{index}" bind:value={Stage3Data.Remark} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" rows="3" disabled={shipment.isSaved}></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="service-report-{index}" class="block text-sm font-medium text-gray-700">Service report attachment:</label>
                {#if !shipment.isSaved}
                <input type="file" id="service-report-{index}" on:change={(e) => handleStage3FileChange(e, 'service', index)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="mt-1 block w-full" required>
                {/if}
                {#if Stage3Data.Report}
                  <div class="mt-2">
                    <span class="text-sm text-gray-600">{shipment.serviceFileName || 'File uploaded'}</span>
                    <button 
                      type="button" 
                      on:click={() => previewFile(Stage3Data.Report)}
                      class="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Preview
                    </button>
                    <button 
                      type="button" 
                      on:click={() => downloadFile(Stage3Data.Report, shipment.serviceFileName)}
                      class="text-green-600 hover:text-green-800"
                    >
                      Download
                    </button>
                  </div>
                {/if}
              </div>
              <div>
                <label for="service-ticket-id-{index}" class="block text-sm font-medium text-gray-700">Service ticket Id:</label>
                <input type="text" id="service-ticket-id-{index}" bind:value={Stage3Data.Ticketid} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required disabled={shipment.isSaved}>
              </div>
            </div>
          </div>
        {/if}

        {#if !shipment.isSaved}
          <button 
            type="button" 
            on:click={() => saveShipment(index)}
            class="mt-14 absolute down-2 right-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Save 
          </button>
        {/if}
      </div>
    {/each}

  </div>
  
  <!-- File Preview Modal -->
  <div id="filePreviewModal" class="modal" style="display: none;">
    <div class="modal-content">
      <span class="close" on:click={closeFilePreviewModal}>&times;</span>
      <iframe id="filePreviewFrame" style="width: 100%; height: 500px;"></iframe>
    </div>
  </div>
        
        <!-- Return Pickup toggle button -->
        <button 
          type="button" 
          on:click={toggleReturnPickup}
          class="mt-4 mb-4 px-4 py-2 {returnPickupRequested ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded absolute bottom-2 left-2"
          disabled={returnPickupDetailsSaved} 
        >
          {returnPickupRequested ? 'Cancel Return Pickup' : 'Request Return Pickup'}
        </button>
       <!-- Return Pickup Details box -->
       {#if returnPickupRequested && !showReturnPickupConfirmation}
       <div class="mb-8 p-4 border rounded-lg relative">
         <h4 class="text-lg font-bold mb-4">Return Pickup Details</h4>
         <div class="space-y-4">
           <div class="flex space-x-4">
             <div class="flex-1">
               <label for="return-pickup-name" class="block text-sm font-medium text-gray-700">Name:</label>
               <input 
                 type="text" 
                 id="return-pickup-name" 
                 bind:value={Stage4Data.ReturnPickupName} 
                 class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
                 required
                 disabled={returnPickupDetailsSaved}
               >
             </div>
             <div class="flex-1">
               <label for="return-pickup-mobile" class="block text-sm font-medium text-gray-700">Mobile Number:</label>
               <input 
                 type="tel" 
                 id="return-pickup-mobile" 
                 bind:value={Stage4Data.ReturnPickupMobile} 
                 on:input={handleReturnPickupMobileInput}
                 class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
                 pattern="[0-9]{10}"
                 maxlength="10"
                 required
                 disabled={returnPickupDetailsSaved}
               >
             </div>
           </div>
           <div>
             <label for="return-pickup-remark" class="block text-sm font-medium text-gray-700">Project Manager's Remark:</label>
             <textarea 
               id="return-pickup-remark" 
               bind:value={Stage4Data.ReturnPickupRemark} 
               class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
               rows="3" 
               required
               disabled={returnPickupDetailsSaved}
             ></textarea>
           </div>
           {#if !returnPickupDetailsSaved}
             <button 
               type="button" 
               on:click={saveReturnPickupDetails}
               class="mt-4 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 absolute down-2 right-2"
             >
               Save
             </button>
           {/if}
         </div>
       </div>
     {/if}

 {#if showReturnPickupConfirmation}
 <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
   <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
     <h3 class="text-lg font-bold mb-4">Confirmation</h3>
     <p class="mb-4">Are you sure you want to request a Return Pickup?</p>
     <div class="flex justify-end">
       <button 
         on:click={() => showReturnPickupConfirmation = false}
         class="mr-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
       >
         Cancel
       </button>
       <button 
         on:click={confirmReturnPickup}
         class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
       >
         Confirm
       </button>
     </div>
   </div>
 </div>
{/if}
   </div>

   
   {:else if currentStage === 4 && stageData[4].visible}
   <!-- Return Pickup Stage -->
   <div class="mb-8 p-4 border rounded-lg relative">
    {#if returnPickup.rejected}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong class="font-bold">Rejected:</strong>
        <span class="block sm:inline"> {returnPickup.rejectionRemark}</span>
    </div>
  {/if}
  <h4 class="text-lg font-bold mb-4">Return Pickup Report</h4>

  <div class="space-y-4">
    <div class="flex space-x-4">
      <div class="flex-1">
        <label for="return-pickup-name" class="block text-sm font-medium text-gray-700">Name:</label>
            <input 
              type="text" 
              id="return-pickup-name" 
              bind:value={returnPickup.name} 
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
              required
              disabled={returnPickup.isSaved}
        >
      </div>
      <div class="flex-1">
        <label for="return-pickup-mobile" class="block text-sm font-medium text-gray-700">Mobile Number:</label>
        <input 
          type="tel" 
          id="return-pickup-mobile" 
              bind:value={returnPickup.mobile} 
              on:input={handleReturnPickupMobileInput}
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
          pattern="[0-9]{10}"
          maxlength="10"
          required
          disabled={returnPickup.isSaved}
        >
      </div>
    </div>

    <div>
      <label for="return-pickup-remark" class="block text-sm font-medium text-gray-700">Project Manager's Remark:</label>
          <textarea 
            id="return-pickup-remark" 
            bind:value={returnPickup.remark} 
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
        rows="3" 
        required
        disabled={returnPickup.isSaved}
      ></textarea>
    </div>
  </div>

  <!-- Additional fields -->
  <div class="flex space-x-4 mt-4">
    <div class="flex-1">
      <label for="dc-number" class="block text-sm font-medium text-gray-700">DC Number:</label>
      <input 
        type="text" 
        id="dc-number" 
        bind:value={returnPickup.dcNumber} 
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
        required
        disabled={returnPickup.isSaved}
      >
    </div>
    <div class="flex-1">
      <label for="tracking-no" class="block text-sm font-medium text-gray-700">Courier's tracking no.:</label>
      <input 
        type="text" 
        id="tracking-no" 
        bind:value={returnPickup.trackingNo} 
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
        required
        disabled={returnPickup.isSaved}
      >
    </div>
    <div class="flex-1">
      <label for="dc-amount" class="block text-sm font-medium text-gray-700">DC Amount:</label>
      <input 
        type="text" 
        id="dc-amount" 
        bind:value={returnPickup.dcAmount} 
        on:input={formatAmountreturn}
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
        required
        disabled={returnPickup.isSaved}
      >
    </div>
  </div>
  <div class="flex space-x-4 mt-4">
    <div class="flex-1">
      <label for="dispatched-date" class="block text-sm font-medium text-gray-700">Dispatched date:</label>
      <input 
        type="date" 
        id="dispatched-date" 
            bind:value={returnPickup.dispatchedDate} 
            on:change={updateDeliveryDateMin}
        max={getCurrentDate()}
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
        required
        disabled={returnPickup.isSaved}
      >
    </div>
    <div class="flex-1">
      <label for="delivery-date" class="block text-sm font-medium text-gray-700">Delivery date:</label>
      <input 
        type="date" 
        id="delivery-date" 
        bind:value={returnPickup.deliveryDate} 
        min={returnPickup.dispatchedDate}
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
        required
        disabled={returnPickup.isSaved}
      >
    </div>
  </div>
  <div class="mt-4">
    <label for="return-pickup-remark" class="block text-sm font-medium text-gray-700">Remark:</label>
    <textarea 
    id="return-pickup-remark" 
    bind:value={returnPickup.dcaccountRemark} 
      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
      rows="3" 
      required
      disabled={returnPickup.isSaved}
    ></textarea>
  </div>
  <div class="mt-4">
    <label for="attachment" class="block text-sm font-medium text-gray-700">Attachment:</label>
    {#if !returnPickup.isSaved}
    <input 
    type="file" 
    id="attachment" 
    on:change={handleReturnPickupFileChange}
      class="mt-1 block w-full" 
      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      required
    >
    {/if}
        {#if returnPickup.file}
          <div class="mt-2">
            <span class="text-sm text-gray-600">{returnPickup.fileName || 'File uploaded'}</span>
        <button 
          type="button" 
          on:click={() => previewFile(returnPickup.file)}
              class="text-blue-600 hover:text-blue-800 ml-2"
        >
          Preview
        </button>
        <button 
          type="button" 
          on:click={() => downloadFile(returnPickup.file, returnPickup.fileName || '')}
    class="text-green-600 hover:text-green-800 ml-2"
        >
          Download
        </button>
      </div>
    {/if}
  </div>

  {#if !returnPickup.isSaved}
    <button 
      type="button" 
      on:click={saveReturnPickup}
      class="mt-4 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 absolute bottom-2 right-2"
    >
      Save
    </button>
  {/if}
</div>


<!-- File Preview Modal -->
<div id="filePreviewModal" class="modal" style="display: none;">
<div class="modal-content">
  <span class="close" on:click={closeFilePreviewModal}>&times;</span>
  <iframe id="filePreviewFrame" style="width: 100%; height: 500px;"></iframe>
</div>
</div>


  {:else if currentStage === (stageData[4].visible ? 5 : 4)}
  <!-- Share with Account stage content -->
  <h4 class="text-lg font-bold mb-2">Installation or Service Report</h4>
  <!-- Ongoing Shipments -->
  {#each shipments.filter(s => s.isSaved) as shipment, index}
    <div class="mb-6 p-4 border rounded-lg relative">
      <!-- New fields -->
      <div>
        <label for="installation-remarks-{index}" class="block text-sm font-medium text-gray-700">Installation remarks:</label>
        <textarea id="installation-remarks-{index}" bind:value={shipment.installationRemarks} class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" rows="3" disabled={shipment.isDataSaved}></textarea>
      </div>
      <div>
        <label for="installation-report-{index}" class="block text-sm font-medium text-gray-700">Installation report attachment:</label>
        {#if !shipment.isDataSaved}
            <input type="file" id="installation-report-{index}" on:change={(e) => handleStage3FileChange(e, 'installation', index)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="mt-1 block w-full" required>
          {/if}
          {#if shipment.installationFile}
            <div class="mt-2">
              <span class="text-sm text-gray-600">{shipment.installationFileName || 'File uploaded'}</span>
            <button 
              type="button" 
              on:click={() => previewFile(shipment.installationFile)}
              class="text-blue-600 hover:text-blue-800 mr-2"
            >
              Preview
            </button>
            <button 
              type="button" 
              on:click={() => downloadFile(shipment.installationFile, shipment.installationFileName)}
                class="text-green-600 hover:text-green-800 ml-2"
            >
              Download
            </button>
          </div>
        {/if}
      </div>

          
      <!-- Approval/Rejection toggle buttons -->
      <div class="flex justify-center space-x-4 mb-4">
        <button
          type="button"
          class="px-3 py-1 {shipment.accountStatus === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-200'} rounded"
          on:click={() => {
            if (shipment.accountStatus === 'rejected') {
              shipment.rejected = false;
              shipment.rejectionRemark = '';
            }
            shipment.accountStatus = 'approved';
            shipment.accountRemark = '';
          }}
          disabled={shipment.isDataSaved}
        >
          Approved
        </button>
        <button
          type="button"
          class="px-3 py-1 {shipment.accountStatus === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-200'} rounded"
          on:click={() => {
            shipment.accountStatus = 'rejected';
            shipment.accountRemark = '';
            shipment.rejected = true;
            shipment.rejectionRemark = '';
          }}
          disabled={shipment.isDataSaved}
        >
          Rejected
        </button>
      </div>

      <!-- Remark field -->
      <div class="mb-2">
        <label for="shipment-remark-{index}" class="block text-sm font-medium text-gray-700">Remark:</label>
        <textarea 
          id="shipment-remark-{index}" 
          bind:value={shipment.accountRemark} 
          on:input={() => {
            if (shipment.accountStatus === 'rejected') {
              shipment.rejectionRemark = shipment.accountRemark;
            }
          }}
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
          rows="3" 
          required
          disabled={shipment.isDataSaved}
        ></textarea>
      </div>

      <!-- Save/Edit button -->
      <button 
        type="button" 
        on:click={() => {
          if (shipment.isDataSaved) {
            // Enter edit mode
            shipment.isDataSaved = false;
            shipment.isEditing = true;
          } else {
            // Validate before saving
            if (!shipment.accountStatus || !shipment.accountRemark || shipment.accountRemark.trim() === '') {
              alert("Please fill up the details before saving");
              return;
            }
            // Save changes
            shipment.isDataSaved = true;
            shipment.isEditing = false;
            // Add any additional save logic here
          }
        }}
        class="absolute down-2 right-2 px-2 py-1 {shipment.isDataSaved ? 'bg-blue-500' : 'bg-green-500'} text-white rounded text-sm"
      >
        {shipment.isDataSaved ? 'Edit' : 'Save'}
      </button>
    </div>
  {/each}

  <h4 class="text-lg font-bold mb-2">Return Pickups Report</h4>

  <!-- Return Pickups -->
  {#if returnPickup.isSaved}
    <div class="mb-6 p-4 border rounded-lg relative">
       <!-- New fields -->
       <div class="mt-4">
        <label for="return-pickup-remark" class="block text-sm font-medium text-gray-700">Return pickup report remarks:</label>
        <textarea 
        id="return-pickup-remark" 
        bind:value={returnPickup.dcaccountRemark}
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
          rows="3" 
          required
          disabled={returnPickup.isSaved}
        ></textarea>
      </div>
      <div class="mt-4">
        <label for="attachment" class="block text-sm font-medium text-gray-700">Return pickup report attachment:</label>
        {#if !returnPickup.isDataSaved}
        <input 
          type="file" 
          id="attachment" 
            on:change={handleReturnPickupFileChange}
          class="mt-1 block w-full" 
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          required
        >
        {/if}
        {#if returnPickup.file}
          <div class="mt-2">
            <span class="text-sm text-gray-600">{returnPickup.fileName || 'File uploaded'}</span>
            <button 
              type="button" 
              on:click={() => previewFile(returnPickup.file)}
              class="text-blue-600 hover:text-blue-800 ml-2"
            >
              Preview
            </button>
            <button 
              type="button" 
              on:click={() => downloadFile(returnPickup.file, returnPickup.fileName || '')}
              class="text-green-600 hover:text-green-800 ml-2"
            >
              Download
            </button>
          </div>
        {/if}
      </div>
    
      {#if !returnPickup.isSaved}
        <button 
          type="button" 
          on:click={saveReturnPickup}
          class="mt-4 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 absolute bottom-2 right-2"
        >
          Save
        </button>
      {/if}   
      
      <!-- Approval/Rejection toggle buttons -->
      <div class="flex justify-center space-x-4 mb-4">
        <button
          type="button"
          class="px-3 py-1 {returnPickup.accountStatus === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-200'} rounded"
          on:click={() => {
            if (returnPickup.accountStatus === 'rejected') {
              returnPickup.rejected = false;
              returnPickup.rejectionRemark = '';
            }
            returnPickup.accountStatus = 'approved';
            returnPickup.accountRemark = '';
          }}
          disabled={returnPickup.isDataSaved}
        >
          Approved
        </button>
        <button
          type="button"
          class="px-3 py-1 {returnPickup.accountStatus === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-200'} rounded"
          on:click={() => {
            returnPickup.accountStatus = 'rejected';
            returnPickup.accountRemark = '';
            returnPickup.rejected = true;
            returnPickup.rejectionRemark = '';
          }}
          disabled={returnPickup.isDataSaved}
        >
          Rejected
        </button>
      </div>

      <!-- Remark field -->
      <div class="mb-2">
        <label for="pickup-remark" class="block text-sm font-medium text-gray-700">Remark:</label>
        <textarea 
          id="pickup-remark" 
          bind:value={returnPickup.accountRemark} 
          on:input={() => {
            if (returnPickup.accountStatus === 'rejected') {
              returnPickup.rejectionRemark = returnPickup.accountRemark;
            }
          }}
          class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" 
          rows="3" 
          required
          disabled={returnPickup.isDataSaved}
        ></textarea>        
      </div>

      <!-- Save/Edit button -->
      <button 
        type="button" 
        on:click={() => {
          if (returnPickup.isDataSaved) {
            // Enter edit mode
            returnPickup.isDataSaved = false;
            returnPickup.isEditing = true;
          } else {
            // Validate before saving
            if (!returnPickup.accountStatus || !returnPickup.accountRemark || returnPickup.accountRemark.trim() === '') {
              alert("Please fill up the details before saving");
              return;
            }
            // Save changes
            returnPickup.isDataSaved = true;
            returnPickup.isEditing = false;
            // Add any additional save logic here
          }
        }}
        class="absolute down-2 right-2 px-2 py-1 {returnPickup.isDataSaved ? 'bg-blue-500' : 'bg-green-500'} text-white rounded text-sm"
        >
          {returnPickup.isDataSaved ? 'Edit' : 'Save'}
      </button>
    </div>
  {/if}
{/if}
 

        {#if showConfirmationPopup}
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 class="text-lg font-bold mb-4">Confirmation</h3>
            <p class="mb-4">Are you sure you want to submit {stageData[currentStage].title}?</p>
            <div class="flex justify-end">
              <button 
                on:click={() => showConfirmationPopup = false}
                class="mr-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                on:click={confirmSubmit}
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      {/if}

        <!-- Submit and Edit buttons -->
        <div class="flex justify-end mt-4 space-x-2">
          <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Submit
          </button>
           <!-- Previous Stage button -->
          <button 
            type="button" 
            on:click={goToPreviousStage}
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
          >
            Previous Stage
          </button>

              <button 
              type="button" 
              on:click={goToNextStage} 
              class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors duration-200"
              >
              Next Stage
          </button>
          {#if stageData[currentStage].completed}
            <button type="button" on:click={editStage} class="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                Edit
              </button>
            {/if}            
          </div>

    <!-- Time information -->
    <div class="mt-8 text-sm text-gray-500">
      {#if stageStartTimes[currentStage]}
        <p class="absolute bottom-2 left-2">Started on: {stageStartTimes[currentStage]}</p>
      {/if}
      {#if lastSavedTimes[currentStage] && !lastSubmittedTimes[currentStage]}
        <p class="absolute bottom-2 right-2">Last saved on: {lastSavedTimes[currentStage]}</p>
      {:else if lastSubmittedTimes[currentStage]}
        <p class="absolute bottom-2 right-2">Last submitted on: {lastSubmittedTimes[currentStage]}</p>
      {/if}
    </div>

  </form>
  </div>
</div>
</div>

<style>
  /* Custom scrollbar styles */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* Smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  /* Custom focus styles */
  .focus\:outline-none:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
  }

  .focus\:ring-2:focus {
    --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
  }

  /* Gradient background for header */
  .bg-gradient-to-r {
    background-image: linear-gradient(to right, var(--tw-gradient-stops));
  }

  .from-blue-500 {
    --tw-gradient-from: #3B82F6;
    --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(59 130 246 / 0));
  }

  .to-purple-600 {
    --tw-gradient-to: #7C3AED;
  }

  /* Custom animation for collapsible section */
  @keyframes slideDown {
    from { max-height: 0; opacity: 0; }
    to { max-height: 1000px; opacity: 1; }
  }

  @keyframes slideUp {
    from { max-height: 1000px; opacity: 1; }
    to { max-height: 0; opacity: 0; }
  }

  .slide-enter-active {
    animation: slideDown 0.3s ease-out;
  }

  .slide-exit-active {
    animation: slideUp 0.3s ease-in;
  }
</style>

<!-- <style>
  :root {
  --primary-color: #4a90e2;
  --secondary-color: #50e3c2;
  --background-color: #f5f7fa;
  --card-background: #ffffff;
  --text-color: #333333;
  --border-color: #e0e0e0;
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --danger-color: #e74c3c;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
}

.modal-content {
  background-color: var(--card-background);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  width: 95%;
  margin: 2rem auto;
  padding: 2rem;
}

/* Typography */
h2, h3, h4, h5 {
  color: var(--primary-color);
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 2.5rem;
}

/* Form Card */
.form-card {
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
}

.form-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

/* Form elements */
input[type="text"],
input[type="tel"],
input[type="date"],
input[type="file"],
select,
textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

input[type="text"]:focus,
input[type="tel"]:focus,
input[type="date"]:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

/* Buttons */
button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-success {
  background-color: var(--success-color);
  color: white;
}

.btn-warning {
  background-color: var(--warning-color);
  color: white;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

/* Tables */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background-color: var(--card-background);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  background-color: var(--primary-color);
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

/* Modern Stages Progress Bar */
.stages-progress {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  position: relative;
}

.stages-progress::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 4px;
  background-color: var(--border-color);
  transform: translateY(-50%);
  z-index: 1;
}

.stage-item {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stage-bullet {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: var(--card-background);
  border: 4px solid var(--border-color);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  color: var(--text-color);
  transition: all 0.3s ease;
}

.stage-title {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-color);
  text-align: center;
}

.stage-item.active .stage-bullet {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.stage-item.completed .stage-bullet {
  background-color: var(--success-color);
  border-color: var(--success-color);
  color: white;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    padding: 1.5rem;
  }

  .stages-progress {
    flex-wrap: wrap;
  }

  .stage-item {
    flex-basis: 50%;
    margin-bottom: 1rem;
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  animation: fadeIn 0.3s ease;
}
</style> -->