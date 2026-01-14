// lib/api.ts
export async function triggerAiAudit(reportId: string) {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report_id: reportId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Audit failed');
    }

    return await response.json();
  } catch (error) {
    console.error("AI Audit Error:", error);
    throw error;
  }
}