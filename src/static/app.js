document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Event delegation for delete buttons
  activitiesList.addEventListener("click", async (event) => {
    if (event.target.closest(".delete-btn")) {
      const deleteBtn = event.target.closest(".delete-btn");
      const activityName = deleteBtn.dataset.activity;
      const email = deleteBtn.dataset.email;
      
      if (activityName && email) {
        await unregisterParticipant(activityName, email);
      }
    }
  });

  // Helper function to escape HTML characters
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Function to create a participant item element safely
  function createParticipantElement(participant, activityName) {
    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant-item';
    
    const emailSpan = document.createElement('span');
    emailSpan.className = 'participant-email';
    emailSpan.textContent = participant; // Safe - uses textContent instead of innerHTML
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.title = 'Remove participant';
    deleteBtn.dataset.activity = activityName; // Safe - direct property assignment
    deleteBtn.dataset.email = participant; // Safe - direct property assignment
    
    // Create SVG icon safely
    deleteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3,6 5,6 21,6"></polyline>
        <path d="m19,6v14a2,2 0,0 1,-2,2H7a2,2 0,0 1,-2,-2V6m3,0V4a2,2 0,0 1,2,-2h4a2,2 0,0 1,2,2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    
    participantDiv.appendChild(emailSpan);
    participantDiv.appendChild(deleteBtn);
    
    return participantDiv;
  }

  // Function to create activity card safely using DOM manipulation
  function createActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const spotsLeft = details.max_participants - details.participants.length;

    // Create title
    const title = document.createElement('h4');
    title.textContent = name;
    
    // Create description
    const description = document.createElement('p');
    description.textContent = details.description;
    
    // Create schedule
    const schedule = document.createElement('p');
    const scheduleStrong = document.createElement('strong');
    scheduleStrong.textContent = 'Schedule: ';
    schedule.appendChild(scheduleStrong);
    schedule.appendChild(document.createTextNode(details.schedule));
    
    // Create availability
    const availability = document.createElement('p');
    const availabilityStrong = document.createElement('strong');
    availabilityStrong.textContent = 'Availability: ';
    availability.appendChild(availabilityStrong);
    availability.appendChild(document.createTextNode(`${spotsLeft} spots left`));
    
    // Create participants section
    const participantsSection = document.createElement('div');
    participantsSection.className = 'participants-section';
    
    const participantsTitle = document.createElement('strong');
    participantsTitle.textContent = 'Current Participants:';
    participantsSection.appendChild(participantsTitle);
    
    if (details.participants.length > 0) {
      const participantsList = document.createElement('div');
      participantsList.className = 'participants-list';
      
      details.participants.forEach(participant => {
        const participantElement = createParticipantElement(participant, name);
        participantsList.appendChild(participantElement);
      });
      
      participantsSection.appendChild(participantsList);
    } else {
      const noParticipants = document.createElement('p');
      noParticipants.className = 'no-participants';
      noParticipants.textContent = 'No participants yet';
      participantsSection.appendChild(noParticipants);
    }
    
    // Assemble the card
    activityCard.appendChild(title);
    activityCard.appendChild(description);
    activityCard.appendChild(schedule);
    activityCard.appendChild(availability);
    activityCard.appendChild(participantsSection);
    
    return activityCard;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Clear select options (keep the default one)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = createActivityCard(name, details);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name; // Safe - uses textContent
        activitySelect.appendChild(option);
      });
    } catch (error) {
      const errorMsg = document.createElement("p");
      errorMsg.textContent = "Failed to load activities. Please try again later.";
      activitiesList.appendChild(errorMsg);
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh the activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Function to unregister a participant from an activity
  async function unregisterParticipant(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        // Refresh the activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Initialize app
  fetchActivities();
});
