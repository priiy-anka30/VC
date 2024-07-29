<script lang="ts">
 import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';
    import type { SalesOrder } from '$lib/types';
    import '$lib/styles/app.css';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import StageUpdateModal from '$lib/components/StageUpdateModal.svelte';
    import { writable } from 'svelte/store';
    import { ArrowLeft, Download, ChevronDown } from 'svelte-lucide';
    import { logStore, type LogEntry } from '../../../../lib/stores/LogStore';
    import { fly } from 'svelte/transition';
    import { Clock, User, Activity } from 'svelte-lucide';

    export let data: PageData;
    let expandedLog: string | null = null;
 
   function toggleLogExpansion(logId: string) {
     expandedLog = expandedLog === logId ? null : logId;
   }
 
   function getActionIcon(action: string) {
     if (action.toLowerCase().includes('updated')) return 'pencil';
     if (action.toLowerCase().includes('created')) return 'plus-circle';
     if (action.toLowerCase().includes('deleted')) return 'trash-2';
     return 'activity';
   }

    let currentUsername = data.user.name;
    let currentUserRole = data.user.role;
    
    $: salesOrder = data.salesOrder;
    $: activityLogs = data.activityLogs as ActivityLog[];
    $: currentStage = data.currentStage;

    $: console.log(data);

    let showStageUpdateModal = false;
    let showDocumentsDropdown = false;
    let isExpanded = false;
 
     function toggleExpand() {
     isExpanded = !isExpanded;
     }

    function toggleStageUpdateModal() {
        showStageUpdateModal = !showStageUpdateModal;
    }

    function toggleDocumentsDropdown() {
        showDocumentsDropdown = !showDocumentsDropdown;
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-GB', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }

    function getStatusColor(status: string) {
        switch (status.toLowerCase()) {
            case 'open':
                return 'bg-green-100 text-green-800';
            case 'closed':
                return 'bg-gray-100 text-gray-800';
            case 'draft':
                return 'bg-yellow-100 text-yellow-800';
            case 'pending approval':
                return 'bg-blue-100 text-blue-800';
            case 'pending':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-white text-blue-800';
        }
    }

    function goBack() {
        window.history.length > 1 ? window.history.back() : goto('/');
    }

    function downloadDocument(doc: any) {
        // Implement actual download logic here
        console.log(`Downloading ${doc.file_name}`);
        // You might want to use a service or API call to handle the actual download
    }
    let activeTab = 'details';
    function switchTab(tab: any) {
        activeTab = tab;
    }

  let salesOrderLogs: LogEntry[] = [];
  let Stage0Data: any;

  onMount(() => {
    logStore.loadLogs();
    const unsubscribe = logStore.subscribe(allLogs => {
      salesOrderLogs = allLogs[salesOrder.salesorder_number] || [];
    });

    return unsubscribe;
  });

  function handleFieldUpdate(fieldName: string, oldValue: string, newValue: string) {
    const logEntry: LogEntry = {
      username: currentUsername,
      role: currentUserRole,
      action: `Updated ${fieldName} from "${oldValue}" to "${newValue}"`,
      timestamp: new Date()
    };
    logStore.addLog(salesOrder.salesorder_number, logEntry);
    
    const unsubscribe = logStore.subscribe(logs => logStore.saveLogs(logs));
    unsubscribe();
  }

  function formatLogDate(dateString: Date) {
   return new Date(dateString).toLocaleString('en-GB', {
     year: 'numeric',
     month: 'short',
     day: 'numeric',
     hour: '2-digit',
     minute: '2-digit'
   });
 }
 
   function getActionColor(action: string): string {
     if (action.toLowerCase().includes('updated')) return 'bg-blue-500';
     if (action.toLowerCase().includes('created')) return 'bg-green-500';
     if (action.toLowerCase().includes('deleted')) return 'bg-red-500';
     return 'bg-gray-500';
   }
 
</script>

<div class="bg-gray-100 min-h-screen py-8 px-4">
    <div class="max-w-6xl mx-auto">
        <div class="bg-white shadow-xl rounded-lg overflow-hidden">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex flex-col sm:flex-row justify-between items-center">
                <div class="flex items-center mb-4 sm:mb-0">
                    <button 
                        class="mr-4 text-white hover:bg-blue-700 rounded-full p-2 transition duration-300 ease-in-out"
                        on:click={goBack}
                        aria-label="Go back"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 class="text-2xl font-bold text-white">Sales Order: {salesOrder.salesorder_number}</h1>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="px-3 py-1 rounded-full text-sm font-semibold bg-white {getStatusColor(salesOrder.status)}">
                        {salesOrder.status}
                    </span>
                    <button 
                        class="bg-white text-[#3c53e7] hover:bg-gray-100 font-semibold py-2.5 px-5 rounded-md shadow-sm hover:shadow transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                        on:click={toggleStageUpdateModal}
                    >
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        {#if currentStage && currentStage.currentStage === 0}
                            Site Not Ready
                        {:else if currentStage && currentStage.currentStage === 1}
                            Logistic
                        {:else if currentStage && currentStage.currentStage === 2}
                            Material to Procure
                        {:else if currentStage && currentStage.currentStage === 3}
                            Ongoing
                        {:else if currentStage && currentStage.currentStage === 4}
                            Return Pickup
                        {:else if currentStage && currentStage.currentStage === 5}
                            Share With Account
                        {:else}
                            Update Status
                        {/if}
                    </span>
                    </button>
                </div>
            </div>

            <div class="p-6 space-y-8">
                <!-- Order Summary -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="bg-blue-50 p-4 rounded-lg shadow">
                        <h2 class="text-lg font-semibold text-blue-800 mb-2">From</h2>
                        <p class="font-medium">VC TECHNOSOLUTIONS PRIVATE LIMITED</p>
                        <p>Office No-607, 608 Mayuresh Cosmos,
                            Plot No 37, Sector - 11, CBD Belapur</p>
                        <p>Navi Mumbai, Maharashtra 400614</p>
                        <p>India</p>
                        <p class="mt-2 text-blue-600">GSTIN: 27AAHCV4369B1Z8</p>
                    </div>

                    <div class="bg-blue-50 p-4 rounded-lg shadow">
                        <h2 class="text-lg font-semibold text-blue-800 mb-2">To</h2>
                        <p class="font-medium">{salesOrder.customer_name}</p>
                        <p>{salesOrder.billing_address.address}</p>
                        <p>{salesOrder.billing_address.city}, {salesOrder.billing_address.state} {salesOrder.billing_address.zip}</p>
                        <p>{salesOrder.billing_address.country}</p>
                        <p class="mt-2 text-blue-600">GSTIN: {salesOrder.gst_no || 'N/A'}</p>
                    </div>

                    <div class="bg-blue-50 p-4 rounded-lg shadow">
                        <h2 class="text-lg font-semibold text-blue-800 mb-2">Order Info</h2>
                        <p><strong>SO #:</strong> {salesOrder.salesorder_number}</p>
                        <p><strong>Ref#:</strong> {salesOrder.reference_number}</p>
                        <p><strong>Delivery Method:</strong> {salesOrder.delivery_method || 'N/A'}</p>
                        <p><strong>Place of Supply:</strong> {salesOrder.place_of_supply}</p>
                        <p><strong>Date:</strong> {formatDate(salesOrder.submitted_date)}</p>
                    </div>
                </div>

                <!-- Line Items -->
                <div>
                    <h2 class="text-xl font-semibold text-blue-800 mb-4">Line Items</h2>
                    <div class="bg-white shadow rounded-lg overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN/SAC</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {#each salesOrder.line_items as item, index}
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                        <td class="px-6 py-4 text-sm text-gray-900">
                                            <div class="font-medium">{item.name}</div>
                                            <div class="text-gray-500">{item.description}</div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hsn_or_sac}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity} {item.unit}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.rate)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.item_total)}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Order Totals -->
                <div class="bg-white p-4 rounded-lg shadow">
                    <h2 class="text-lg font-semibold text-blue-800 mb-4">Order Totals</h2>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span>Sub Total:</span>
                            <span>{formatCurrency(salesOrder.sub_total)}</span>
                        </div>
                        {#each salesOrder.taxes as tax}
                            <div class="flex justify-between">
                                <span>{tax.tax_name}:</span>
                                <span>{tax.tax_amount_formatted}</span>
                            </div>
                        {/each}
                        <div class="flex justify-between font-semibold text-lg pt-2 border-t border-gray-300">
                            <span>Total:</span>
                            <span>{formatCurrency(salesOrder.total)}</span>
                        </div>
                    </div>
                </div>

                <!-- Additional Information -->
                <div class="bg-white p-4 rounded-lg shadow">
                    <h2 class="text-lg font-semibold text-blue-800 mb-4">Additional Information</h2>
                    <div class="space-y-2">
                        <p><strong>Payment Terms:</strong> {salesOrder.payment_terms}</p>
                        <p><strong>Notes:</strong> {salesOrder.notes}</p>
                        <p><strong>Submitted By:</strong> {salesOrder.submitted_by}</p>
                        <p><strong>Last Modified:</strong> {formatDate(salesOrder.last_modified_time)}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Activity Logs -->
<div class="bg-white p-6 rounded-lg shadow-lg mt-8">
    <h2 class="text-xl font-semibold text-gray-800 mb-6">Activity Logs</h2>
    
    {#if activityLogs && activityLogs.length > 0}
      <div class="relative">
        <!-- Timeline line -->
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
  
        <!-- Log entries -->
        {#each activityLogs as log}
          <div class="mb-8 flex">
            <!-- Timeline dot -->
            <div class="absolute left-4 w-3 h-3 rounded-full mt-1.5 -ml-1.5 {getActionColor(log.action)}"></div>
            
            <!-- Log content -->
            <div class="ml-12">
              <div class="flex items-center mb-1">
                <span class="font-medium text-gray-900 mr-2">{log.username}</span>
                <span class="text-sm text-gray-500">({log.role})</span>
    </div>
    <p class="text-gray-700 mb-2">{log.action}</p>
             <span class="text-sm text-gray-500">{formatLogDate(log.timestamp)}</span>
    </div>
  </div>
  {/each}
</div>
{:else}
<p class="text-gray-500 italic">No activity logs available.</p>
{/if}
</div>
   

{#if showStageUpdateModal}
<!-- svelte-ignore missing-declaration -->
<StageUpdateModal
    {Stage0Data} 
    {salesOrder} 
    {data}
    username={currentUsername}
    userRole={currentUserRole}
    on:close={toggleStageUpdateModal}
/>
{/if}