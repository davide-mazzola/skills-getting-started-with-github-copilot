"""
Tests for the Mergington High School Activities API
"""

import pytest
from fastapi.testclient import TestClient
from src.app import app, activities


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture
def reset_activities():
    """Reset activities data before each test"""
    # Store original data
    original_activities = {
        activity_name: {
            "description": activity_data["description"],
            "schedule": activity_data["schedule"],
            "max_participants": activity_data["max_participants"],
            "participants": activity_data["participants"].copy()
        }
        for activity_name, activity_data in activities.items()
    }
    
    yield
    
    # Reset to original state after test
    activities.clear()
    activities.update(original_activities)


class TestGetActivities:
    """Test the GET /activities endpoint"""
    
    def test_get_activities_success(self, client, reset_activities):
        """Test that activities are returned successfully"""
        response = client.get("/activities")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that we get a dictionary of activities
        assert isinstance(data, dict)
        assert len(data) > 0
        
        # Check structure of first activity
        first_activity = list(data.values())[0]
        required_fields = ["description", "schedule", "max_participants", "participants"]
        for field in required_fields:
            assert field in first_activity
    
    def test_get_activities_contains_chess_club(self, client, reset_activities):
        """Test that Chess Club is in the activities"""
        response = client.get("/activities")
        data = response.json()
        
        assert "Chess Club" in data
        chess_club = data["Chess Club"]
        assert chess_club["description"] == "Learn strategies and compete in chess tournaments"
        assert isinstance(chess_club["participants"], list)


class TestSignupForActivity:
    """Test the POST /activities/{activity_name}/signup endpoint"""
    
    def test_signup_success(self, client, reset_activities):
        """Test successful signup for an activity"""
        activity_name = "Chess Club"
        email = "test@mergington.edu"
        
        response = client.post(f"/activities/{activity_name}/signup?email={email}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == f"Signed up {email} for {activity_name}"
        
        # Verify the participant was added
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email in activities_data[activity_name]["participants"]
    
    def test_signup_duplicate_email(self, client, reset_activities):
        """Test that duplicate signup returns error"""
        activity_name = "Chess Club"
        email = "michael@mergington.edu"  # Already in Chess Club
        
        response = client.post(f"/activities/{activity_name}/signup?email={email}")
        
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "Student is already signed up"
    
    def test_signup_nonexistent_activity(self, client, reset_activities):
        """Test signup for non-existent activity returns 404"""
        activity_name = "Nonexistent Activity"
        email = "test@mergington.edu"
        
        response = client.post(f"/activities/{activity_name}/signup?email={email}")
        
        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Activity not found"
    
    def test_signup_url_encoding(self, client, reset_activities):
        """Test signup with URL-encoded activity name"""
        activity_name = "Programming Class"
        email = "test@mergington.edu"
        
        response = client.post(f"/activities/{activity_name}/signup?email={email}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == f"Signed up {email} for {activity_name}"


class TestUnregisterFromActivity:
    """Test the DELETE /activities/{activity_name}/unregister endpoint"""
    
    def test_unregister_success(self, client, reset_activities):
        """Test successful unregistration from an activity"""
        activity_name = "Chess Club"
        email = "michael@mergington.edu"  # Already in Chess Club
        
        response = client.delete(f"/activities/{activity_name}/unregister?email={email}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == f"Unregistered {email} from {activity_name}"
        
        # Verify the participant was removed
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email not in activities_data[activity_name]["participants"]
    
    def test_unregister_not_signed_up(self, client, reset_activities):
        """Test unregistering when not signed up returns error"""
        activity_name = "Chess Club"
        email = "notregistered@mergington.edu"
        
        response = client.delete(f"/activities/{activity_name}/unregister?email={email}")
        
        assert response.status_code == 400
        data = response.json()
        assert data["detail"] == "Student is not signed up for this activity"
    
    def test_unregister_nonexistent_activity(self, client, reset_activities):
        """Test unregistering from non-existent activity returns 404"""
        activity_name = "Nonexistent Activity"
        email = "test@mergington.edu"
        
        response = client.delete(f"/activities/{activity_name}/unregister?email={email}")
        
        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Activity not found"


class TestRootEndpoint:
    """Test the root endpoint redirect"""
    
    def test_root_redirect(self, client):
        """Test that root endpoint redirects to static/index.html"""
        response = client.get("/", follow_redirects=False)
        
        assert response.status_code == 307  # Temporary redirect
        assert response.headers["location"] == "/static/index.html"


class TestIntegration:
    """Integration tests for full workflows"""
    
    def test_full_signup_unregister_workflow(self, client, reset_activities):
        """Test complete workflow: signup then unregister"""
        activity_name = "Programming Class"
        email = "workflow@mergington.edu"
        
        # First, signup
        signup_response = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert signup_response.status_code == 200
        
        # Verify signup worked
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email in activities_data[activity_name]["participants"]
        
        # Then unregister
        unregister_response = client.delete(f"/activities/{activity_name}/unregister?email={email}")
        assert unregister_response.status_code == 200
        
        # Verify unregistration worked
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email not in activities_data[activity_name]["participants"]
    
    def test_participant_count_accuracy(self, client, reset_activities):
        """Test that participant counts are accurate"""
        activity_name = "Gym Class"
        email = "counter@mergington.edu"
        
        # Get initial count
        initial_response = client.get("/activities")
        initial_data = initial_response.json()
        initial_count = len(initial_data[activity_name]["participants"])
        
        # Add participant
        client.post(f"/activities/{activity_name}/signup?email={email}")
        
        # Check count increased
        after_signup_response = client.get("/activities")
        after_signup_data = after_signup_response.json()
        after_signup_count = len(after_signup_data[activity_name]["participants"])
        
        assert after_signup_count == initial_count + 1
        
        # Remove participant
        client.delete(f"/activities/{activity_name}/unregister?email={email}")
        
        # Check count back to original
        final_response = client.get("/activities")
        final_data = final_response.json()
        final_count = len(final_data[activity_name]["participants"])
        
        assert final_count == initial_count